/**
 * 路径工具函数
 * Obsidian 内部路径统一使用 "/"，这里集中做跨平台规范化
 */

/**
 * 规范化 Vault 相对路径
 * - 统一分隔符为 "/"
 * - 去掉首尾空白
 * - 去掉重复分隔符、前导 "./"、末尾 "/"
 */
export function normalizeVaultPath(input: string): string {
	if (typeof input !== 'string') return '';

	let normalized = input.trim().replace(/\\/g, '/');
	normalized = normalized.replace(/\/{2,}/g, '/');
	normalized = normalized.replace(/^\/+/, '');

	while (normalized.startsWith('./')) {
		normalized = normalized.slice(2);
	}

	normalized = normalized.replace(/\/+$/, '');
	return normalized;
}

/**
 * 获取路径中的文件名
 */
export function getFileNameFromPath(input: string): string {
	const normalized = normalizeVaultPath(input);
	if (!normalized) return '';
	const parts = normalized.split('/');
	return parts[parts.length - 1] || '';
}

/**
 * 获取路径中的父目录
 */
export function getParentPath(input: string): string {
	const normalized = normalizeVaultPath(input);
	if (!normalized) return '';
	const idx = normalized.lastIndexOf('/');
	return idx === -1 ? '' : normalized.slice(0, idx);
}

/**
 * 安全解码 URI 片段
 */
export function safeDecodeURIComponent(input: string): string {
	try {
		return decodeURIComponent(input);
	} catch {
		return input;
	}
}
