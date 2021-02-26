export function htmlToText(htmlString: String) {
  let text = htmlString
    .replace(/&nbsp;/g, " ")
    .replace(/<br \/>/g, "\n")
    .replace(/<br>/g, "\n")
    .replace(/<ul>/g, "")
    .replace(/<li>/g, "- ")
    .replace(/<\/li>/g, "\n")
    .replace(/<b>/g, "**")
    .replace(/<\/b>/g, "**")
    .replace(/<span>/g, "")
    .replace(/<\/span>/g, "");
  //get text inside a tag
  const anchorTagRe = /<a.*?\/a>/g;
  // const innerTextRe = /<a.*?>([^<>]*?)<\/a>/g;
  const hrefRe = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/

  const anchorTags = text.match(anchorTagRe);
  anchorTags?.forEach((tag) => {
    const innerText = tag.replace(/<\/?!?(img|a)[^>]*>/g, "")
    const hrefSearch = hrefRe.exec(tag);
    const href = hrefSearch ? hrefSearch[1] : null;
    const outputText = `[${innerText}](${href})`
    text = text.replace(tag, outputText)
  });
  return text;
}
