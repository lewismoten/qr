const COPY = {
  'en-US': {
    title: 'QR Code Generator Handbook',
    contents: 'Contents',
    print: 'Print / save PDF',
    epub: 'Download ePub',
    preparing: 'Preparing handbook...',
    blocked: 'The print window was blocked.',
    failed: 'The handbook could not be created.',
  },
  'en-GB': {
    title: 'QR Code Generator Handbook',
    contents: 'Contents',
    print: 'Print / save PDF',
    epub: 'Download ePub',
    preparing: 'Preparing handbook...',
    blocked: 'The print window was blocked.',
    failed: 'The handbook could not be created.',
  },
  es: {
    title: 'Manual del generador de códigos QR',
    contents: 'Índice',
    print: 'Imprimir / guardar PDF',
    epub: 'Descargar ePub',
    preparing: 'Preparando el manual...',
    blocked: 'El navegador bloqueó la ventana de impresión.',
    failed: 'No se pudo crear el manual.',
  },
  ar: {
    title: 'دليل مولّد رموز QR',
    contents: 'المحتويات',
    print: 'طباعة / حفظ PDF',
    epub: 'تنزيل ePub',
    preparing: 'جارٍ إعداد الدليل...',
    blocked: 'حظر المتصفح نافذة الطباعة.',
    failed: 'تعذّر إنشاء الدليل.',
  },
  'hi-IN': {
    title: 'QR कोड जेनरेटर पुस्तिका',
    contents: 'विषय-सूची',
    print: 'प्रिंट करें / PDF सहेजें',
    epub: 'ePub डाउनलोड करें',
    preparing: 'पुस्तिका तैयार की जा रही है...',
    blocked: 'ब्राउज़र ने प्रिंट विंडो को ब्लॉक कर दिया।',
    failed: 'पुस्तिका नहीं बनाई जा सकी।',
  },
  'zh-CN': {
    title: '二维码生成器手册',
    contents: '目录',
    print: '打印 / 保存 PDF',
    epub: '下载 ePub',
    preparing: '正在准备手册...',
    blocked: '浏览器阻止了打印窗口。',
    failed: '无法创建手册。',
  },
};

export function getHandbookCopy(locale) {
  return COPY[locale] || COPY['en-US'];
}
