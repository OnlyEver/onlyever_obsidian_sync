import {RootContent} from "mdast";
import {toMarkdown} from "mdast-util-to-markdown";
import {mathToMarkdown} from "mdast-util-math";
import {removeNewLine} from "./oeMdastHelper";

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

		block.type 		= "paragraph";
		this.content 	= removeNewLine(toMarkdown(block, {extensions: [mathToMarkdown()]}))
		this.block_type = "heading";
		// @ts-ignore
        this.heading_level = block.depth;
		this.children 	   = [];
	}
}

export class ParagraphBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();
		this.block_type = "paragraph";

		// @ts-ignore
		if(block && block?.block_type === 'paragraph'){
			// @ts-ignore
			this.content = block.content;
		}else{
			this.content = removeNewLine(toMarkdown(block, {extensions: [mathToMarkdown()]}))
		}
	}

}

export class ListBlock extends OeBlock {
	content: ListItemBlock[];

	constructor(blockFragmentFromRawLines: string[] = []) {
		super();
		this.block_type = "list";

		if (blockFragmentFromRawLines.length > 0) {
			const allListItemsNotNestedNoChildren = this.flattenAndParseListItems(blockFragmentFromRawLines);
			this.content 										 = this.buildNestedStructure(allListItemsNotNestedNoChildren);
		} else {
			this.content = [];
		}
	}

	private flattenAndParseListItems(lines: string[]): ListItemBlock[] {
		const listItems: ListItemBlock[] = [];

		for (const line of lines) {
			const match = line.match(/^(\s*)(\S*\s*)(.*)/);

			if (match) {
				const indentation = match[1].replace(/\t/g, '    ').length;
				let indicator 	   = match[2];
				let text 		   = match[3];
				let type: 'ordered' | 'unordered' | 'checkbox' | 'not-a-list-item';

				if (indicator === line) {
					type = 'unordered';
					indicator = '-';
					text = line;
				} else if (this.isCheckboxItem(text)) {
					type = "checkbox";
					indicator = text.startsWith('[x]') ? '[x]' : '[ ]';
					text = text.replace(/\[ \]|\[x\]/, '');
				} else if (this.isUnorderedItem(indicator)) {
					type = 'unordered';
				}else if (this.isOrderedItem(indicator)) {
					type = "ordered";
				}else{
					type = 'not-a-list-item';
				}

				if(type === 'not-a-list-item'){
					const  previousListItem  = listItems.pop();

					if(previousListItem){
						previousListItem.content = previousListItem.content + "\n" + line
						listItems.push(previousListItem);
					}
				}else{
					listItems.push(new ListItemBlock(text, type, indicator, indentation));
				}
			}
		}

		return listItems;
	}

	private buildNestedStructure(listItems: ListItemBlock[]): ListItemBlock[] {
		const nestedList: ListItemBlock[] = [];
		const stack: ListItemBlock[] = [];

		for (const item of listItems) {
			while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
				stack.pop();
			}

			if (stack.length > 0) {
				const listBlockInsideChild = stack[stack.length - 1].children;

				if (listBlockInsideChild.length === 0) {
					listBlockInsideChild.push(new ListBlock());
				}

				stack[stack.length - 1].children[0].content.push(item);
			} else {
				nestedList.push(item);
			}

			stack.push(item);
		}

		return nestedList;
	}

	private unsetLevelProperty(blocks: OeBlock[]): void {
		for (const block of blocks) {
			if (block instanceof ListItemBlock) {
				// @ts-ignore
				delete ((block as never).level);
			} else if (block instanceof ListBlock) {
				this.unsetLevelProperty(block.content);
			}
		}
	}

	public unsetLevelInListItemBlocks(): ListBlock {
		this.unsetLevelProperty(this.content);

		return this;
	}

	private isOrderedItem(indicator: string) {
		return indicator.trim().endsWith('.') && !isNaN(Number(indicator.trim().slice(0, -1))) && indicator.trim().slice(0, -1) !== ''
	}

	private isUnorderedItem(indicator: string){
		return indicator.startsWith('*') || indicator.startsWith('-')
	}

	private isCheckboxItem(text: string) {
		return text.startsWith('[ ]') || text.startsWith('[x]')
	}
}


class ListItemBlock extends OeBlock {
	content: 	string
	level:   	number
	list_type: 	string
	marker:  	string
	children: 	OeBlock[]

	constructor(content: string, list_type: string, marker: string, level: number) {
		super();
		this.block_type = 'list_item'
		this.content    = content
		this.level 		= level
		this.list_type 	= list_type
		this.children 	= []
		this.marker		= marker;
	}
}

export class ImageBlock extends OeBlock {
	img_src: string;
	img_caption: string;

	constructor(block: RootContent) {
		super();

		this.block_type  = "image";
		// @ts-ignore
        this.img_src     = block.children[0].url
		// @ts-ignore
        this.img_caption = block.children[0].alt
	}

}

export class TableBlock extends OeBlock {
	rows: RowBlock[];

	constructor(block: RootContent) {
		super();

		this.block_type = "table";
		this.rows 	    = [];

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
		this.values     = [];
		this.is_heading = rowIndex === 0;

		// @ts-ignore
        block.children.forEach((innerBlock: RootContent)=>{
			innerBlock.type = "paragraph";

			this.values.push(removeNewLine(toMarkdown(innerBlock, {extensions: [mathToMarkdown()]})))
		})
	}
}

export class CodeBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "code";
		// @ts-ignore
        this.content 	= block.value;
	}
}

export class BlockQuoteBlock extends OeBlock {
	content: string;

	constructor(block: RootContent) {
		super();

		this.block_type = "block_quote";
		block.type   	= "paragraph";
		this.content 	= removeNewLine(toMarkdown(block, {extensions: [mathToMarkdown()]}));
	}
}

export class MathBlock extends OeBlock {
	markup_type: "latex" | "mathml" | string;
	content: string;


	constructor(block: RootContent) {
		super();

		this.block_type = "math";
		// @ts-ignore
        this.content 	= block.value;
	}
}

export class EmptyBlock extends OeBlock{
	constructor() {
		super();
		this.block_type = "empty_line";
	}
}
