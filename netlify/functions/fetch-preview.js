exports.handler = async (event) => {
  const targetUrl = event.queryStringParameters && event.queryStringParameters.url;

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'الرابط مفقود' }),
    };
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TakweenPreviewBot/1.0)' },
      redirect: 'follow',
    });
    const html = await res.text();

    const getByProperty = (prop) => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m) return m[1];
      }
      return '';
    };
    const getByName = (name) => {
      const patterns = [
        new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m) return m[1];
      }
      return '';
    };

    const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
    let title = getByProperty('og:title') || (titleTagMatch ? titleTagMatch[1] : '');
    let description = getByProperty('og:description') || getByName('description');
    let image = getByProperty('og:image');

    if (!image) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) image = imgMatch[1];
    }

    if (image && image.startsWith('/')) {
      const u = new URL(targetUrl);
      image = u.origin + image;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        title: (title || '').trim(),
        description: (description || '').trim(),
        image: image || '',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'تعذر جلب معلومات الرابط', details: String(err) }),
    };
  }
};
