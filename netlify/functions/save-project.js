exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'طريقة غير مسموحة' }) };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return {
      statusCode: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'يجب تسجيل الدخول أولًا' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'بيانات غير صالحة' }) };
  }

  const { category, title, description, link, image } = payload;
  if (!title || !link) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'اسم المشروع والرابط مطلوبان' }),
    };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const FILE_PATH = 'content/portfolio.json';

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'إعدادات الخادم غير مكتملة: أضف GITHUB_TOKEN و GITHUB_REPO في إعدادات الموقع' }),
    };
  }

  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'takween-site-function',
  };

  try {
    const getRes = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers });
    if (!getRes.ok) throw new Error('تعذر قراءة ملف الأعمال الحالي من GitHub');
    const getData = await getRes.json();
    const currentContent = JSON.parse(Buffer.from(getData.content, 'base64').toString('utf-8'));
    if (!Array.isArray(currentContent.items)) currentContent.items = [];

    currentContent.items.push({
      category: category || 'custom',
      title,
      description: description || '',
      link,
      image: image || '',
    });

    const newContentB64 = Buffer.from(JSON.stringify(currentContent, null, 2), 'utf-8').toString('base64');

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `إضافة مشروع جديد للأعمال: ${title}`,
        content: newContentB64,
        sha: getData.sha,
        branch: GITHUB_BRANCH,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error('فشل حفظ الملف على GitHub: ' + errText);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String((err && err.message) || err) }),
    };
  }
};
