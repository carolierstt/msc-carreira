export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { email, nome, pdfBase64, score, nivel } = req.body;

  if (!email || !pdfBase64) {
    return res.status(400).json({ error: 'Email e PDF são obrigatórios' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Resend não configurado' });
  }

  const nomeDisplay = nome || 'Candidato';
  const reacesso = `https://msc-carreira.vercel.app/msc_resultado_pago.html?email=${encodeURIComponent(email)}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0C0C18;color:#F2F2FF;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:28px">
        <h1 style="font-size:28px;margin:0;background:linear-gradient(135deg,#FF6B6B,#7C3AED);-webkit-background-clip:text;-webkit-text-fill-color:transparent">MSC</h1>
        <p style="color:rgba(242,242,255,.5);font-size:13px;margin:4px 0 0">Mapeando Sua Carreira</p>
      </div>

      <h2 style="font-size:20px;margin-bottom:8px">Olá, ${nomeDisplay}!</h2>
      <p style="color:rgba(242,242,255,.6);font-size:14px;line-height:1.7;margin-bottom:20px">
        Seu diagnóstico completo de carreira está em anexo. Score: <strong style="color:#FF6B6B">${score}/100 — Nível ${nivel}</strong>.
      </p>

      <div style="background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.25);border-radius:10px;padding:16px;margin-bottom:20px">
        <p style="font-size:13px;color:rgba(242,242,255,.7);margin:0 0 8px;font-weight:600">Para acessar o resultado online novamente:</p>
        <a href="${reacesso}" style="color:#7C3AED;font-size:12px;word-break:break-all">${reacesso}</a>
      </div>

      <p style="color:rgba(242,242,255,.4);font-size:12px;line-height:1.6;margin-bottom:20px">
        O PDF em anexo contém toda a análise: score completo, bloqueios identificados, comparação com o mercado, 
        avaliação de dados pessoais, plano de ação e sua frase de posicionamento para o LinkedIn.
      </p>

      <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:16px;text-align:center">
        <p style="color:rgba(242,242,255,.25);font-size:11px;margin:0">MSC — Mapeando Sua Carreira · msc-carreira.vercel.app</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MSC — Mapeando Sua Carreira <noreply@mapeandosuacarreira.com.br>',
        to: [email],
        subject: `Seu diagnóstico completo está aqui — Score ${score}/100`,
        html,
        attachments: [{
          filename: `MSC_Diagnostico_${nomeDisplay.replace(/\s+/g,'_')}.pdf`,
          content: pdfBase64
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.message || 'Erro ao enviar email' });
    }

    return res.status(200).json({ ok: true, id: data.id });

  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
