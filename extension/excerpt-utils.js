(function initShareClaudeExcerptUtils(root) {
	const EXCERPT_HEADER_RE = /excerpt_from_previous_claude_message\.txt:\s*(?:\r?\n){2}/g
	const EXCERPT_MARKER = 'excerpt_from_previous_claude_message.txt:'
	const FENCED_EXCERPT_RE = /^```[^\n\r]*\r?\n([\s\S]*?)\r?\n```/

	function splitTextOnExcerpts(text) {
		const parts = []
		let cursor = 0
		const headerRe = new RegExp(EXCERPT_HEADER_RE.source, 'g')
		let headerMatch

		while ((headerMatch = headerRe.exec(text)) !== null) {
			const excerptStart = headerMatch.index
			const bodyStart = headerRe.lastIndex

			if (excerptStart > cursor) {
				parts.push({ type: 'markdown', content: text.slice(cursor, excerptStart) })
			}

			const remaining = text.slice(bodyStart)
			const fencedMatch = remaining.match(FENCED_EXCERPT_RE)

			let excerptContent = ''
			let blockEnd = bodyStart

			if (fencedMatch) {
				excerptContent = (fencedMatch[1] || '').trim()
				blockEnd = bodyStart + fencedMatch[0].length
			} else {
				// Plain excerpt content ends at the next paragraph break, preserving
				// any following non-quoted message text.
				const nextParagraphBreak = text.slice(bodyStart).search(/\r?\n\r?\n/)
				blockEnd =
					nextParagraphBreak === -1
						? text.length
						: bodyStart + nextParagraphBreak
				excerptContent = text.slice(bodyStart, blockEnd).trim()
			}

			if (excerptContent) {
				parts.push({ type: 'excerpt', content: excerptContent })
			}

			cursor = blockEnd
			headerRe.lastIndex = blockEnd
		}

		if (cursor < text.length) {
			parts.push({ type: 'markdown', content: text.slice(cursor) })
		}

		return parts.length > 0 ? parts : [{ type: 'markdown', content: text }]
	}

	function transformExcerptBlocks(text, transformExcerpt) {
		const parts = splitTextOnExcerpts(text)
		return parts
			.map((part) => {
				if (part.type !== 'excerpt') return part.content
				return transformExcerpt(part.content)
			})
			.join('')
	}

	root.ShareClaudeExcerptUtils = {
		EXCERPT_HEADER_RE,
		EXCERPT_MARKER,
		FENCED_EXCERPT_RE,
		splitTextOnExcerpts,
		transformExcerptBlocks
	}
})(globalThis)
