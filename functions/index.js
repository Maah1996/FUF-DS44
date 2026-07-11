/* ============================================================
   FUF-DS44 · Proxy seguro a Claude (Anthropic)
   - La API key NUNCA está en el navegador: vive aquí como secreto.
   - Solo usuarios autenticados pueden llamar la función.
   - Los PDF se leen desde Firebase Storage (carpeta del propio usuario).
   ============================================================ */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const MODELOS = ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5'];

const SYSTEM =
  "Eres un experto en prevención de riesgos laborales de Chile y en el DS N° 44/2024 (SGSST). " +
  "Responde en español, claro y práctico, citando artículos cuando corresponda. Usa los documentos adjuntos " +
  "(normas, leyes y DS) como fuente. Cuando propongas medidas, entrégalas como pasos accionables. Aclara que " +
  "tus respuestas son orientativas y deben validarse con el asesor SST o el organismo administrador de la Ley 16.744.";

exports.askClaude = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: 'us-east1', timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    const uid = request.auth.uid;

    const { model, question, history, docs, firstMessage } = request.data || {};
    if (!question || typeof question !== 'string') {
      throw new HttpsError('invalid-argument', 'Falta la consulta.');
    }
    const mdl = MODELOS.includes(model) ? model : 'claude-sonnet-5';

    // Contenido del turno del usuario. Los PDF se adjuntan solo en el primer mensaje.
    const userContent = [];
    if (firstMessage && Array.isArray(docs) && docs.length) {
      const bucket = admin.storage().bucket();
      const validos = docs.filter(d => String((d && d.path) || '').startsWith(`fuf_biblioteca/${uid}/`));
      for (let i = 0; i < validos.length; i++) {
        const d = validos[i];
        let buf;
        try { const [contents] = await bucket.file(d.path).download(); buf = contents; }
        catch (e) { continue; } // si un PDF no se puede leer, se omite
        userContent.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') },
          title: d.name || 'documento',
          citations: { enabled: true },
          ...(i === validos.length - 1 ? { cache_control: { type: 'ephemeral' } } : {})
        });
      }
    }
    userContent.push({ type: 'text', text: question });

    const historial = Array.isArray(history) ? history : [];
    const messages = historial.concat([{ role: 'user', content: userContent }]);

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY.value(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model: mdl, max_tokens: 1500, system: SYSTEM, messages })
      });
    } catch (e) {
      throw new HttpsError('unavailable', 'No se pudo conectar con la API de Claude.');
    }

    if (!r.ok) {
      let em = 'Error ' + r.status;
      try { const j = await r.json(); em = (j.error && j.error.message) || em; } catch (e) {}
      if (r.status === 401) em = 'La API key del servidor es inválida (401). Revisa el secreto ANTHROPIC_API_KEY.';
      if (r.status === 429) em = 'Límite de uso alcanzado (429). Espera un momento y reintenta.';
      throw new HttpsError('internal', em);
    }

    const j = await r.json();
    if (j.stop_reason === 'refusal') return { refusal: true };

    let text = '', cites = [];
    (j.content || []).forEach(b => {
      if (b.type === 'text') { text += b.text; if (b.citations) b.citations.forEach(c => cites.push(c)); }
    });
    return { text, cites };
  }
);
