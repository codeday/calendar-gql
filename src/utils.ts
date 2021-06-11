import { registerEnumType } from 'type-graphql';
import marked, { Renderer } from 'marked';
import frontMatter from 'front-matter';
import { decode } from 'html-entities';

export enum Format {
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  DISCORD = 'DISCORD',
}
registerEnumType(Format, { name: 'Format' });

function stripHtml(htmlString: string): string {
  return htmlString
    .replace(/<br[^>/]*\/?>/g, `\n`)
    .replace(`&nbsp;`, ' ')
    .replace(/<[^>]*>/g, '');
}

function htmlToMd(htmlString: string): string {
  let text = htmlString
    .replace(/<li>/g, '- ')
    .replace(/<\/li[^>]*>/g, `\n`)
    .replace(/<b>/g, '**')
    .replace(/<\/b>/g, '**');
  // get text inside a tag
  const anchorTagRe = /<a.*?\/a>/g;
  // const innerTextRe = /<a.*?>([^<>]*?)<\/a>/g;
  const hrefRe = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/;

  const anchorTags = text.match(anchorTagRe);
  anchorTags?.forEach((tag) => {
    const innerText = tag.replace(/<\/?!?(img|a)[^>]*>/g, '');
    const hrefSearch = hrefRe.exec(tag);
    const href = hrefSearch ? hrefSearch[1] : null;
    const outputText = `[${innerText}](${href})`;
    text = text.replace(tag, outputText);
  });
  return stripHtml(text);
}

const discordRenderer: Renderer = {
  options: {},
  code(code: string, infostring: string): string {
    const fence = '```';
    return `${fence}${infostring}\n${code}${fence}`;
  },
  blockquote(quote: string): string {
    return quote.split(`\n`).map((line) => `> ${line}`).join(`\n`);
  },
  html(html: string): string {
    return stripHtml(html);
  },
  heading(text: string, level: number): string {
    if (level === 1) return `__***${text.toUpperCase()}***__`;
    if (level === 2) return `__***${text}***__`;
    if (level === 3) return `***${text}***`;
    if (level === 4) return `**${text}**`;
    if (level === 5) return `*${text}*`;
    return text;
  },
  hr() {
    return `\n---\n`;
  },
  list(body: string): string {
    return body;
  },
  listitem(text: string): string {
    return `- ${text}`;
  },
  checkbox(checked: boolean): string {
    return `[${checked ? 'x' : ' '}]`;
  },
  paragraph(text: string): string {
    return `${text}\n`;
  },
  table(header: string, body: string): string {
    return body;
  },
  tablerow(content: string): string {
    return content;
  },
  tablecell(content: string): string {
    return content;
  },
  strong(text: string): string {
    return `**${text}**`;
  },
  em(text: string): string {
    return `*${text}*`;
  },
  codespan(code: string): string {
    return `\`${code}\``;
  },
  br(): string {
    return `\n`;
  },
  del(text: string): string {
    return `~~${text}~~`;
  },
  link(href: string) {
    return `<${href}>`;
  },
  image(href: string): string {
    return href;
  },
  text(text: string): string {
    return text;
  },
};

export function formatDescription(
  text: string,
  format: Format,
):{ metadata: Record<string, unknown>, description: string } {
  try {
    const { attributes, bodyBegin } = frontMatter(stripHtml(text));
    const body = htmlToMd(text).split(`\n`).slice((bodyBegin || 1) - 1).join(`\n`);
    const renderer = format === Format.DISCORD ? discordRenderer : undefined;
    const rendered = format === Format.MARKDOWN
      ? body
      : marked(
        body,
        {
          renderer,
          mangle: false,
          headerIds: false,
        },
      );
    return {
      metadata: <Record<string, unknown>>attributes,
      description: format === Format.DISCORD ? decode(rendered) : rendered,
    };
  } catch (ex) {
    return { description: text, metadata: {} };
  }
}
