import { escapeHtmlAttr } from './security';

export type AlignmentType = 'left' | 'center' | 'right';

export class ImageAlignment {
	/**
	 * 去除已存在的对齐包装，避免重复嵌套
	 */
	private static stripExistingAlignment(markdown: string): string {
		let cleanMarkdown = markdown.trim();

		const blockMatch = cleanMarkdown.match(/^===\s*(left|center|right)\s*===\s*([\s\S]*?)\s*===$/i);
		if (blockMatch) {
			return blockMatch[2].trim();
		}

		cleanMarkdown = cleanMarkdown.replace(/^\{\s*align\s*=\s*(left|center|right)\s*\}\s*/i, '').trim();
		return cleanMarkdown;
	}

	/**
	 * 为图片Markdown语法添加对齐属性
	 */
	static applyAlignment(markdown: string, alignment: AlignmentType): string {
		// 支持 Markdown 图片和 Wiki 链接语法
		const mediaRegex = /!\[[^\]]*\]\(([^)]+)\)|!?\[\[[^\]]+\]\]/;
		const match = markdown.match(mediaRegex);

		if (!match) {
			return markdown;
		}

		const cleanMarkdown = this.stripExistingAlignment(markdown);
		return `===${alignment}===\n${cleanMarkdown}\n===`;
	}

	/**
	 * 从图片语法中提取对齐方式
	 */
	static getAlignment(markdown: string): AlignmentType | null {
		// 匹配 ===center=== 块语法
		const blockMatch = markdown.match(/^===\s*(left|center|right)\s*===/i);
		if (blockMatch) {
			const alignment = blockMatch[1].toLowerCase();
			if (alignment === 'left' || alignment === 'center' || alignment === 'right') {
				return alignment as AlignmentType;
			}
		}

		// 匹配 {align=center} 或 { align=center } 风格
		const alignMatch = markdown.match(/{\s*align\s*=\s*(\w+)\s*}/i);
		if (alignMatch) {
			const alignment = alignMatch[1].toLowerCase();
			if (alignment === 'left' || alignment === 'center' || alignment === 'right') {
				return alignment as AlignmentType;
			}
		}
		return null;
	}

	/**
	 * 生成带对齐样式的HTML图片标签
	 */
	static toHTML(imagePath: string, altText: string = '', alignment: AlignmentType = 'center'): string {
		const styleMap: Record<AlignmentType, string> = {
			'left': 'display: block; margin-left: 0; margin-right: auto;',
			'center': 'display: block; margin-left: auto; margin-right: auto;',
			'right': 'display: block; margin-left: auto; margin-right: 0;'
		};

		return `<img src="${escapeHtmlAttr(imagePath)}" alt="${escapeHtmlAttr(altText)}" style="${styleMap[alignment]}" />`;
	}
}
