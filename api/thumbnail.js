import getRenderedPage from './_utils/getRenderedPage';
import chromium from "chrome-aws-lambda";
import stream from 'stream';
import resizeImg from 'resize-img';

export default async function handler(req, res) {
  // take only whats necesary from query
  const params = {
    header: req.query.header,
    title: req.query.title,
    description: req.query.description,
    photoUrl: req.query.photoUrl,
  }
  if (
    !params.header ||
    !params.title ||
    !params.description
  ) {
    return res.status(400).json({ message: "The following parameters are required: header, title, description, photoUrl" });
  }
  if (!params.photoUrl) {
    params.photoUrl = 'https://i.ibb.co/m0mWdtK/ttplogo.png';
  }

  const pageTemplate = getRenderedPage(params);
  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
  });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setContent(pageTemplate);
    const content = await page.$('body');
    const imageBuffer = await content.screenshot({ omitBackground: true });
    const smallImage = await resizeImg(imageBuffer, {
      width: 500,
    });

    var readStream = new stream.PassThrough();
    readStream.end(smallImage);

    // set cache control for vercel
    res.setHeader('Cache-Control', 'max-age=0, s-maxage=86400');
    res.setHeader('Content-disposition', 'attachment; filename=thumbnail.png');
    res.setHeader('Content-Type', 'image/png');

    readStream.pipe(res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ...error });
  } finally {
    await browser.close();
  }
}