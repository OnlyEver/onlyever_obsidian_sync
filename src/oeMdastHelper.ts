import {Root, RootContent} from "mdast";
import {
	BlockQuoteBlock,
	CodeBlock, EmptyBlock,
	HeadingBlock,
	ImageBlock,
	ListBlock, ListItemBlock, MathBlock,
	OeBlock,
	ParagraphBlock,
	TableBlock
} from "./classes";

export function isImageElement(block: RootContent) {
	return block.type === "paragraph" && block.children && block.children.length === 1 && block.children[0].type === 'image';
}

export function containsMdastImageBlock(block: RootContent) {
	// @ts-ignore
	return block.children.some((child: RootContent) => child.hasOwnProperty('type') && child.type === 'image');
}

export function fragmentMdastParagraphBlock(paragraph: RootContent) {

	const fragmentedParagraphs: Array<RootContent> = [];
	let currentFragment: [] = [];

	// @ts-ignore
	paragraph.children.forEach((child: RootContent) => {
		if (child.type === 'image') {
			if (currentFragment.length > 0) {
				fragmentedParagraphs.push({type: "paragraph", children: currentFragment});
				currentFragment = [];
			}
			fragmentedParagraphs.push({type: "paragraph", children: [child]});
		} else {
			// @ts-ignore
			currentFragment.push(child);
		}
	})

	if (currentFragment.length > 0) {
		fragmentedParagraphs.push({type: "paragraph", children: currentFragment});
	}

	return fragmentedParagraphs;
}

export function parseMdastBlockToOeBlock(block: RootContent, content: string): OeBlock {

	switch (block.type) {
		case "code":
			return new CodeBlock(block);
		case "heading":
			return new HeadingBlock(block);
		case "image":
			return new ImageBlock(block);
		case "blockquote":
			return new BlockQuoteBlock(block);
		case "table":
			return new TableBlock(block);
		case "math":
			return new MathBlock(block);
		/**
		 * Do not remove this line..
		 * This line is in-fact reachable, even tho the IDE suggests its not.
		 * This is because RootContent doesn't contain "empty_line" as a value for the type property.
		 * But "empty_line" exists because we manually pushed empty_line block when revising the ree.
		 */
		//@ts-ignore
		case "empty_line":
			return new EmptyBlock();
		case "list":{
			const blockStartLine= block.position?.start.line ?? 0;
			const blockEndLine= block.position?.end.line ?? 0;
			const rawLines= content.split("\n");
			const blockFragmentFromRawLines= rawLines.slice(blockStartLine-1, blockEndLine)

			return new ListBlock(blockFragmentFromRawLines);
		}
		default:
			if (isImageElement(block)) {
				return new ImageBlock(block)
			}
			return new ParagraphBlock(block);

	}
}

export function restructureInitialMdastTree(tree: Root, numberOfSpacesMappedToEmptyLineNumber: { [key: number]: number }) {
	const revisedTree = {'type': 'root', children: []} as Root;
	let previousBlockEnd = 0;

	let loopIteration = 0;
	let currentItemStartLine = 0;

	const emptyBlock  = {
		type: 'empty_line',
	}
	const emptyParagraphBlock  = {
		type: 'paragraph',
		children: [{
			type: "text",
			value: ""
		}]
	}

	const lineNumbersWithEmptyLines = Object.keys(numberOfSpacesMappedToEmptyLineNumber)

	tree.children?.forEach((childBlock: RootContent) => {
		if(loopIteration!==0){
			currentItemStartLine = childBlock.position?.start.line ?? 0;
			let lookBackLineNumber =  currentItemStartLine - 1;

			while(lookBackLineNumber >= previousBlockEnd){

				if(lineNumbersWithEmptyLines.contains(String(lookBackLineNumber))){
					const numberOfSpaces = numberOfSpacesMappedToEmptyLineNumber[lookBackLineNumber];

					if(numberOfSpaces > 0){
						revisedTree.children.push(emptyParagraphBlock as RootContent)
					}else{
						revisedTree.children.push(emptyBlock as RootContent);
					}
				}

				lookBackLineNumber = lookBackLineNumber - 1;
			}
		}

		if (childBlock.type === 'paragraph' && childBlock.children && childBlock.children.length > 1 && containsMdastImageBlock(childBlock)) {
			const fragmentedBlocks: Array<RootContent> = fragmentMdastParagraphBlock(childBlock);

			fragmentedBlocks.forEach((innerChild: RootContent) => {
				revisedTree.children?.push(innerChild);
			});
		} else {
			revisedTree.children?.push(childBlock);
		}

		previousBlockEnd = childBlock.position?.end.line ?? 0;
		loopIteration++;
	});

	return revisedTree;
}
