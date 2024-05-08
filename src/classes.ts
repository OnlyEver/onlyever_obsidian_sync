import {Root, RootContent} from "mdast";
import {toMarkdown} from "mdast-util-to-markdown";
import {mathToMarkdown} from "mdast-util-math";

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
	list_type: "ordered" | "unordered";
	content: ListItemBlock[];

	constructor(block: RootContent) {
		super();

		this.block_type = "list";
		// @ts-ignore
        this.list_type = block.ordered ? 'ordered' : 'unordered';
		this.content = [];

		// @ts-ignore
        block.children.forEach((innerBlock: RootContent) => {
			this.content.push(new ListItemBlock(innerBlock));
		})
	}
}

export class ListItemBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "list_type";
		block.type = "paragraph";
		this.content = toMarkdown(block, {extensions: [mathToMarkdown()]})
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
	length: number
	constructor() {
		super();
		this.block_type = "empty_line";
		this.length = 1
	}
}
