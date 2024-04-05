import {Root, RootContent} from "mdast";
import {
	BlockQuoteBlock,
	CodeBlock,
	HeadingBlock,
	ImageBlock,
	ListBlock, MathBlock,
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

export function parseMdastBlockToOeBlock(block: RootContent): OeBlock {

	switch (block.type) {
		case "code":
			return new CodeBlock(block);
		case "heading":
			return new HeadingBlock(block);
		case "image":
			return new ImageBlock(block);
		case "list":
			return new ListBlock(block);
		case "blockquote":
			return new BlockQuoteBlock(block);
		case "table":
			return new TableBlock(block);
		case "math":
			return new MathBlock(block);
		default:
			if (isImageElement(block)) {
				return new ImageBlock(block)
			}
			return new ParagraphBlock(block);

	}
}

export function restructureInitialMdastTree(tree: Root) {
	const revisedTree = {'type': 'root', children: []} as Root;

	tree.children?.forEach((childBlock: RootContent) => {
		if (childBlock.type === 'paragraph'
			&& childBlock.children
			&& childBlock.children.length > 1
			&& containsMdastImageBlock(childBlock)
		) {
			const fragmentedBlocks: Array<RootContent> = fragmentMdastParagraphBlock(childBlock);

			fragmentedBlocks.forEach((innerChild: RootContent) => {
				revisedTree.children?.push(innerChild);
			});
		} else {
			revisedTree.children?.push(childBlock);
		}
	});

	return revisedTree;
}
