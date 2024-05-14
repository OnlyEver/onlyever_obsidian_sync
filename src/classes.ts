import {Root, RootContent} from "mdast";
import {toMarkdown} from "mdast-util-to-markdown";
import {mathToMarkdown} from "mdast-util-math";
import {visit} from "unist-util-visit";

export class OeBlock {
	block_type: string;
	content: any
}

export class HeadingBlock extends OeBlock {
	heading_level: number;
	children: OeBlock[];
	content: string;

	constructor(block: RootContent) {
		super();

		block.type = "paragraph";
		this.content = toMarkdown(block, {extensions: [mathToMarkdown()]})
		this.block_type = "heading";
		// @ts-ignore
        this.heading_level = block.depth;
		this.children = [];
	}
}

export class ParagraphBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "paragraph";
		this.content = toMarkdown(block, {extensions: [mathToMarkdown()]})
	}

}

export class ListBlock extends OeBlock {
	content: ListItemBlock[];

	constructor(blockFragmentFromRawLines: string[]) {
		super();
		const temp = this.parseListItems(blockFragmentFromRawLines);
		this.block_type = "list";
		this.content = this.buildNestedStructure(temp);
	}

	private parseListItems(lines: string[]): ListItemBlock[] {
		const listItems: ListItemBlock[] = [];

		for (const line of lines) {
			const match = line.match(/^(\s*)(\S*\s*)(.*)/);
			if (match) {
				const indentation = match[1].replace(/\t/g, '    ').length;
				let indicator = match[2];
				let text = match[3];
				let type: 'ordered' | 'unordered' | 'checkbox';

				if (indicator === line) {
					type = 'unordered';
					indicator = '-';
					text = line;
				} else if (text.startsWith('[ ]') || text.startsWith('[x]')) {
					type = "checkbox";
					indicator = text.startsWith('[x]') ? 'x' : 'y';
				} else {
					if (indicator.startsWith('*') || indicator.startsWith('-')) {
						type = 'unordered';
					} else {
						type = 'ordered';
					}
				}

				listItems.push(new ListItemBlock(text, indentation, type, indicator));
			}
		}

		return listItems;
	}

	private buildNestedStructure(listItems: ListItemBlock[]): ListItemBlock[] {
		const root: ListItemBlock = new ListItemBlock("", -1, 'unordered', '-');
		const stack: ListItemBlock[] = [root];

		for (const item of listItems) {
			let parent = stack.pop();
			while (parent && parent.level >= item.level) {
				parent = stack.pop();
			}
			if (parent) {
				parent.children[0] = parent.children[0] || [];
				//@ts-expect-error
				parent.children[0].push({
					content: item.content,
					list_type: item.list_type,
					marker: item.marker,
					children: item.children
				} as ListItemBlock);
				stack.push(parent, item);
			} else {
				stack.push(item);
			}
		}

		return root.children || [];
	}
}

export class ListItemBlock extends OeBlock {
	content: string;
	list_type: "ordered" | "unordered" | "checkbox";
	marker: string
	children: ListItemBlock[] = [];
	level: number
	constructor(text: string, level: number, type: 'ordered' | 'unordered' | 'checkbox', indicator: string) {
		super();
		this.block_type = "list_item";
		this.content = text;
		this.level = level;
		this.list_type = type;
		this.marker = indicator.trim();
	}
}

export class ImageBlock extends OeBlock {
	img_src: string;
	img_caption: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "image";
		// @ts-ignore
        this.img_src = block.children[0].url
		// @ts-ignore
        this.img_caption = block.children[0].alt
	}

}

export class TableBlock extends OeBlock {
	rows: RowBlock[];

	constructor(block: RootContent) {
		super();

		this.block_type = "table";
		this.rows = [];

		// @ts-ignore
        block.children.forEach((innerBlock: RootContent, index: number) =>{
			this.rows.push(new RowBlock(innerBlock, index))
		})
	}
}

export class RowBlock extends OeBlock {
	is_heading: boolean;
	values: Array<string>;

	constructor(block: RootContent, rowIndex = 0) {
		super();

		this.block_type = "row";
		this.values = [];
		this.is_heading = rowIndex === 0;

		// @ts-ignore
        block.children.forEach((innerBlock: RootContent)=>{
			innerBlock.type = "paragraph";

			this.values.push(toMarkdown(innerBlock, {extensions: [mathToMarkdown()]}))
		})
	}
}

export class CodeBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "code";
		// @ts-ignore
        this.content = block.value;
	}
}

export class BlockQuoteBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "block_quote";
		block.type = "paragraph";
		this.content = toMarkdown(block, {extensions: [mathToMarkdown()]});
	}
}

export class MathBlock extends OeBlock {
	markup_type: "latex" | "mathml" | string;
	content: string;


	constructor(block: RootContent) {
		super();

		this.block_type = "math";
		// @ts-ignore
        this.content = block.value;
	}
}

export class EmptyBlock extends OeBlock{
	constructor() {
		super();
		this.block_type = "empty_line";
	}
}
