export const GUIDE_ROUTES = Object.freeze([
  'index',
  'about',
  'privacy',
  'spec',
  'technology',
  'content/frame',
  'content/text',
  'content/number',
  'content/wifi',
  'content/email',
  'content/phone',
  'content/sms',
  'content/geo',
  'content/event',
  'content/vcard',
  'content/file',
  'content/bulk-import',
  'style/modules',
  'style/colors',
  'style/artwork',
  'download/image',
  'download/document',
  'download/animation',
  'debug/mask',
]);

const NATIVE_ROUTES = Object.freeze({
  es: {
    root: ['es', 'guias'],
    segments: {
      about: 'acerca-de',
      animation: 'animacion',
      artwork: 'ilustraciones',
      'bulk-import': 'importacion-masiva',
      colors: 'colores',
      content: 'contenido',
      debug: 'depuracion',
      document: 'documentos',
      download: 'descargas',
      email: 'correo-electronico',
      event: 'eventos',
      file: 'archivos',
      frame: 'texto-del-marco',
      geo: 'ubicacion-geografica',
      image: 'imagenes',
      mask: 'mascaras',
      modules: 'modulos',
      number: 'numeros',
      phone: 'telefono',
      privacy: 'privacidad',
      spec: 'especificacion-qr',
      style: 'diseno',
      technology: 'tecnologia',
      text: 'texto',
    },
  },
  ar: {
    root: ['ar', 'أدلة'],
    segments: {
      about: 'حول',
      artwork: 'رسومات',
      'bulk-import': 'استيراد-مجمع',
      animation: 'رسوم-متحركة',
      colors: 'ألوان',
      content: 'محتوى',
      debug: 'تصحيح',
      document: 'مستندات',
      download: 'تنزيلات',
      email: 'بريد-إلكتروني',
      event: 'أحداث',
      file: 'ملفات',
      frame: 'نص-الإطار',
      geo: 'موقع-جغرافي',
      image: 'صور',
      mask: 'أقنعة',
      modules: 'وحدات',
      number: 'أرقام',
      phone: 'هاتف',
      privacy: 'الخصوصية',
      spec: 'مواصفات-qr',
      style: 'تصميم',
      technology: 'تقنية',
      text: 'نص',
    },
  },
  'hi-IN': {
    root: ['hi-IN', 'मार्गदर्शिकाएं'],
    segments: {
      about: 'परिचय',
      artwork: 'कलाकृति',
      'bulk-import': 'थोक-आयात',
      animation: 'ऐनिमेशन',
      colors: 'रंग',
      content: 'सामग्री',
      debug: 'डीबग',
      document: 'दस्तावेज',
      download: 'डाउनलोड',
      email: 'ईमेल',
      event: 'कार्यक्रम',
      file: 'फ़ाइलें',
      frame: 'फ़्रेम-पाठ',
      geo: 'भौगोलिक-स्थान',
      image: 'चित्र',
      mask: 'मास्क',
      modules: 'मॉड्यूल',
      number: 'संख्याएं',
      phone: 'फ़ोन',
      privacy: 'गोपनीयता',
      spec: 'क्यूआर-विनिर्देश',
      style: 'डिज़ाइन',
      technology: 'तकनीक',
      text: 'पाठ',
    },
  },
  'zh-CN': {
    root: ['zh-CN', '指南'],
    segments: {
      about: '关于',
      artwork: '图稿',
      'bulk-import': '批量导入',
      animation: '动画',
      colors: '颜色',
      content: '内容',
      debug: '调试',
      document: '文档',
      download: '下载',
      email: '电子邮件',
      event: '事件',
      file: '文件',
      frame: '边框文字',
      geo: '地理位置',
      image: '图像',
      mask: '掩码',
      modules: '模块',
      number: '数字',
      phone: '电话',
      privacy: '隐私',
      spec: '二维码规范',
      style: '样式',
      technology: '技术',
      text: '文本',
    },
  },
});

export const GUIDE_LOCALES = Object.freeze([
  'en-US',
  'en-GB',
  ...Object.keys(NATIVE_ROUTES),
]);

function translatedRoute(route, locale) {
  const segments = route === 'index' ? [] : route.split('/');
  if (locale === 'en-GB') return ['en-GB', 'guides', ...segments];
  const config = NATIVE_ROUTES[locale];
  if (!config) {
    return route === 'index' ? ['guides'] : ['guides', ...route.split('/')];
  }
  return [
    ...config.root,
    ...segments.map((part) => config.segments[part] || part),
  ];
}

export function getGuideOutputPath(route, locale = 'en-US') {
  const parts = translatedRoute(route, locale);
  if (route === 'index') return [...parts, 'index.html'].join('/');
  return parts.join('/') + '.html';
}

export function getGuidePublicPath(route, locale = 'en-US') {
  const output = getGuideOutputPath(route, locale);
  return route === 'index' ? output.replace(/index\.html$/, '') : output;
}

export function getGuideRouteFromPath(value) {
  if (typeof value !== 'string') return null;
  const path = value.replace(/^\.\//, '').replace(/^\//, '');
  for (const locale of GUIDE_LOCALES) {
    for (const route of GUIDE_ROUTES) {
      const output = getGuideOutputPath(route, locale);
      const publicPath = getGuidePublicPath(route, locale);
      if (path === output || path === publicPath) return route;
    }
  }
  const legacy = path.match(
    /^guides\/(.*?)(?:\.(?:ar|es|hi-IN|zh-CN))?\.html$/,
  );
  if (legacy && GUIDE_ROUTES.includes(legacy[1])) return legacy[1];
  return null;
}

export const GUIDE_LANGUAGE_LABELS = Object.freeze({
  'en-US': ['🇺🇸', 'English (US)'],
  'en-GB': ['🇬🇧', 'English (UK)'],
  es: ['🇪🇸', 'Español'],
  ar: ['🇸🇦', 'العربية'],
  'hi-IN': ['🇮🇳', 'हिन्दी'],
  'zh-CN': ['🇨🇳', '简体中文'],
});

export const NAVIGATION_ALIASES = Object.freeze({
  es: {
    keys: ['pestana', 'subpestana'],
    tabs: {
      content: 'contenido',
      style: 'diseno',
      download: 'descargas',
      debug: 'depuracion',
    },
    subtabs: {
      data: 'datos',
      format: 'formato',
      frame: 'marco',
      size: 'tamano',
      modules: 'modulos',
      colors: 'colores',
      artwork: 'ilustraciones',
      image: 'imagen',
      document: 'documento',
      animation: 'animacion',
      encoding: 'codificacion',
      mask: 'mascara',
      payload: 'carga-util',
      overlay: 'superposicion',
    },
  },
  ar: {
    keys: ['تبويب', 'تبويب-فرعي'],
    tabs: {
      content: 'محتوى',
      style: 'تصميم',
      download: 'تنزيل',
      debug: 'تصحيح',
    },
    subtabs: {
      data: 'بيانات',
      format: 'تنسيق',
      frame: 'إطار',
      size: 'حجم',
      modules: 'وحدات',
      colors: 'ألوان',
      artwork: 'رسومات',
      image: 'صورة',
      document: 'مستند',
      animation: 'رسوم-متحركة',
      encoding: 'ترميز',
      mask: 'قناع',
      payload: 'حمولة',
      overlay: 'تراكب',
    },
  },
  'hi-IN': {
    keys: ['टैब', 'उपटैब'],
    tabs: {
      content: 'सामग्री',
      style: 'शैली',
      download: 'डाउनलोड',
      debug: 'डीबग',
    },
    subtabs: {
      data: 'डेटा',
      format: 'प्रारूप',
      frame: 'फ़्रेम',
      size: 'आकार',
      modules: 'मॉड्यूल',
      colors: 'रंग',
      artwork: 'कलाकृति',
      image: 'चित्र',
      document: 'दस्तावेज',
      animation: 'ऐनिमेशन',
      encoding: 'एन्कोडिंग',
      mask: 'मास्क',
      payload: 'पेलोड',
      overlay: 'ओवरले',
    },
  },
  'zh-CN': {
    keys: ['标签页', '子标签页'],
    tabs: { content: '内容', style: '样式', download: '下载', debug: '调试' },
    subtabs: {
      data: '数据',
      format: '格式',
      frame: '边框',
      size: '尺寸',
      modules: '模块',
      colors: '颜色',
      artwork: '图稿',
      image: '图像',
      document: '文档',
      animation: '动画',
      encoding: '编码',
      mask: '掩码',
      payload: '载荷',
      overlay: '叠加层',
    },
  },
});
