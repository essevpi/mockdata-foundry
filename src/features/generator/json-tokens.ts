export type JsonTokenKind =
  | 'boolean'
  | 'key'
  | 'null'
  | 'number'
  | 'plain'
  | 'punctuation'
  | 'string'
  | 'whitespace';

export type JsonToken = {
  kind: JsonTokenKind;
  text: string;
};

// One line of `JSON.stringify` output (indented) holds complete tokens: string values cannot span
// lines because line breaks inside strings are escaped. Groups, in order: whitespace, key (a string
// followed by a colon), string, number, boolean, null, punctuation.
const TOKEN_PATTERN =
  /(\s+)|("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],:])/y;

const GROUP_KINDS: JsonTokenKind[] = [
  'whitespace',
  'key',
  'string',
  'number',
  'boolean',
  'null',
  'punctuation',
];

function tokenizeLine(line: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let position = 0;

  while (position < line.length) {
    TOKEN_PATTERN.lastIndex = position;
    const match = TOKEN_PATTERN.exec(line);

    if (match) {
      const kind = GROUP_KINDS[match.slice(1).findIndex((group) => group !== undefined)];

      tokens.push({ kind, text: match[0] });
      position += match[0].length;
      continue;
    }

    // Anything unrecognised is kept as plain text so joining the tokens always restores the line.
    const previous = tokens[tokens.length - 1];

    if (previous?.kind === 'plain') {
      previous.text += line[position];
    } else {
      tokens.push({ kind: 'plain', text: line[position] });
    }

    position += 1;
  }

  return tokens;
}

// Splits indented JSON text into lines of typed tokens for the Editor view. Joining each line's
// token text restores the line exactly; a trailing newline does not add an empty last line.
export function tokenizeJsonLines(json: string): JsonToken[][] {
  const lines = json.split('\n');

  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.map(tokenizeLine);
}
