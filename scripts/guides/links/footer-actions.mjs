import path from 'node:path';

const ACTION_ROUTES = new Set(['about', 'privacy', 'spec']);

function actionRoute(value, context) {
  if (/^(?:[a-z]+:|#|\/\/)/i.test(value)) return null;
  const pathname = value.split(/[?#]/, 1)[0];
  const target = path.normalize(
    path.join(path.dirname(context.file), pathname),
  );
  return (
    context.routes.get(target) || context.routes.get(path.basename(target))
  );
}

export function annotateFooterActions(source, context) {
  return source.replace(/<footer\b[\s\S]*?<\/footer>/g, (footer) => {
    return footer.replace(
      /<a\b(?![^>]*\bdata-footer-action=)([^>]*\bhref=(['"])(.*?)\2[^>]*)>/g,
      (tag, attributes, quote, value) => {
        const route = actionRoute(value, context);
        return ACTION_ROUTES.has(route)
          ? `<a data-footer-action="${route}"${attributes}>`
          : tag;
      },
    );
  });
}
