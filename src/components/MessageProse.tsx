import { Fragment, type ReactNode } from "react";

type MessageProseProps = {
  text: string;
};

/** Split on **bold** / *italic*, leave unmatched markers as plain text. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`}>{match[2]}</strong>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${i++}`}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes;
}

function isBulletLine(line: string): boolean {
  return /^[-•]\s+\S/.test(line.trim());
}

function bulletText(line: string): string {
  return line.trim().replace(/^[-•]\s+/, "");
}

export function MessageProse({ text }: MessageProseProps) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const blocks = normalized.split(/\n{2,}/);

  return (
    <div className="message-prose">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim().length > 0);
        if (lines.length === 0) return null;

        const allBullets = lines.every(isBulletLine);
        if (allBullets) {
          return (
            <ul key={`block-${blockIndex}`} className="message-prose__list">
              {lines.map((line, lineIndex) => (
                <li key={`li-${blockIndex}-${lineIndex}`}>
                  {renderInline(
                    bulletText(line),
                    `b${blockIndex}-l${lineIndex}`,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="message-prose__p">
            {lines.map((line, lineIndex) => (
              <Fragment key={`p-${blockIndex}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `p${blockIndex}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
