const PAGE_URL = 'https://shareclaude.pages.dev'
const CLAUDE_API_URL = 'https://claude.ai/api/organizations'
let organizationId = ''

const loaderSVG = `<svg width="20px" height="20px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" class="animate-spin text-white"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"/><path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"/></g></svg>`

// Store artifacts content globally for updates
const artifactsCache = new Map()

async function getOrganizationId() {
	// If organizationId is already set, return it
	if (organizationId) return organizationId
	try {
		const response = await fetch(CLAUDE_API_URL, {
			credentials: 'include',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			}
		})

		if (!response.ok) {
			throw new Error('Failed to fetch organizations')
		}

		const data = await response.json()
		if (data?.length > 0) {
			const chatOrg = data.find((org) => org.capabilities?.includes('chat'))
			if (chatOrg) {
				return chatOrg.uuid
			}
		}

		throw new Error('No organization found')
	} catch (error) {
		console.error('Failed to get organization:', error)
		return null
	}
}

function getConversationId() {
	const match = window.location.href.match(/\/chat\/([^\/]+)/)
	return match?.[1] || null
}

function processAttachments({ attachments = [], files = [] }) {
	const formatAttachment = ({ file_type, file_name, extracted_content }) => {
		const fileType = file_type?.split('/')[1] || file_type
		const content = fileType
			? `\`\`\`${fileType}\n${extracted_content}\n\`\`\``
			: extracted_content

		return `\n\n${file_name}:\n\n${content}`
	}

	const formatFile = ({ file_name }) =>
		file_name ? `\n\n${file_name} (can't show blob content)\n\n` : ''

	return (
		attachments.map(formatAttachment).join('') + files.map(formatFile).join('')
	)
}

function processArtifact(item) {
	const { id, type, language, content, command, old_str, new_str, title } =
		item.input

	if (!id) return ''

	// Build artifact properties
	const artifactProps = {
		identifier: id,
		type: type || artifactsCache.get(id)?.artifactType,
		title: title || id,
		language: language || artifactsCache.get(id)?.language
	}

	const propString = Object.entries(artifactProps)
		.filter(([_, value]) => value)
		.map(([key, value]) => `${key}="${value}"`)
		.join(' ')

	// Handle content updates
	if (command === 'update' && old_str && new_str) {
		const artifactData = artifactsCache.get(id)
		if (!artifactData?.content) return ''

		artifactData.content = artifactData.content.replace(old_str, new_str)
		artifactsCache.set(id, artifactData)
		return formatArtifactOutput(propString, artifactData.content)
	}

	// Handle content creation/rewrite or otherwise
	if (content) {
		const artifactData =
			command === 'rewrite'
				? { ...artifactsCache.get(id), content }
				: { content, artifactType: type, language }

		artifactsCache.set(id, artifactData)
		return formatArtifactOutput(propString, content)
	}

	return ''
}

function formatArtifactOutput(props, content) {
	return `\n<antArtifact ${props}>\n${content}\n</antArtifact>\n`
}

function processREPL({ input: { code = '' } }) {
	return code ? `\n\`\`\`javascript\n${code}\n\`\`\`\n` : ''
}

function processContentItem(item) {
	switch (item.type) {
		case 'text':
			return item.text
		case 'tool_use':
			if (item.name === 'artifacts') {
				return processArtifact(item)
			} else if (item.name === 'repl') {
				return processREPL(item)
			}
			//handle other tool_use items
			return ''
		default:
			return ''
	}
}

function processMessage(msg) {
	const { sender, content, attachments, files_v2 } = msg
	let message = ''

	// if content has only single item -> old message format else new message format
	if (content.length === 1) {
		message = content[0].text
	} else {
		message = content.map(processContentItem).join('')
	}

	if (sender === 'human') {
		message += processAttachments({ attachments, files: files_v2 })
	}

	return {
		source: sender === 'human' ? 'user' : 'claude',
		message: message.trim()
	}
}

async function getConversationMessages({ organizationId, conversationId }) {
	if (!organizationId || !conversationId) return null

	try {
		const response = await fetch(
			`${CLAUDE_API_URL}/${organizationId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`,
			{
				headers: {
					accept: '*/*',
					'content-type': 'application/json'
				},
				credentials: 'include'
			}
		)

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`)
		}

		const data = await response.json()
		return {
			title: data.name,
			content: data.chat_messages.map(processMessage)
		}
	} catch (error) {
		console.error('Error fetching conversation:', error)
		return null
	}
}

async function getShareURL(messages) {
	try {
		const response = await fetch(`${PAGE_URL}/api/chats`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(messages)
		})

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`)
		}

		const { id } = await response.json()
		// Clear artifacts content after successful share
		artifactsCache.clear()
		return `${PAGE_URL}/c/${id}`
	} catch (error) {
		console.error('Error getting share URL:', error)
		return null
	}
}

// --- Export conversion functions ---

function convertToMarkdown(title, messages) {
	let md = `# ${title}\n\n`
	messages.forEach(({ source, message }) => {
		const role = source === 'user' ? 'Human' : 'Claude'
		md += `## ${role}\n\n${message}\n\n---\n\n`
	})
	return md
}

function convertToText(title, messages) {
	let txt = `${title}\n${'='.repeat(title.length)}\n\n`
	messages.forEach(({ source, message }) => {
		const role = source === 'user' ? 'Human' : 'Claude'
		const plain = message
			.replace(/```[\s\S]*?```/g, (match) =>
				match.replace(/```\w*\n?/g, '').trim()
			)
			.replace(/`([^`]+)`/g, '$1')
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/\*([^*]+)\*/g, '$1')
			.replace(/#{1,6}\s/g, '')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		txt += `${role}:\n${plain}\n\n`
	})
	return txt
}

function convertToHTML(title, messages) {
	const esc = (str) =>
		str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

	let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 16px; background: #2C2B28; color: #e0e0e0; line-height: 1.6; }
h1 { font-size: 1.5rem; color: #f0f0f0; text-align: center; padding: 24px 0 16px; }
h1::after { content: ''; display: block; width: 48px; height: 2px; background: #D97757; margin: 12px auto 0; border-radius: 1px; }
article { margin: 16px 0; padding: 16px 20px; border-radius: 12px; }
article.human { background: #21201C; border: 1px solid rgba(100,100,100,0.3); }
article.claude { background: #333330; border: 1px solid rgba(100,100,100,0.2); }
.role { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
article.human .role { color: #999; }
article.claude .role { color: #D97757; }
.content { white-space: pre-wrap; line-height: 1.7; font-size: 15px; }
pre { background: #1a1a18; padding: 12px 16px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 13px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14px; }
th, td { padding: 8px 12px; border: 1px solid #444; text-align: left; }
th { background: #21201C; font-weight: 600; }
hr { border: none; border-top: 1px solid rgba(100,100,100,0.2); margin: 4px 0; }
</style>
</head>
<body>
<h1>${esc(title)}</h1>\n`

	messages.forEach(({ source, message }) => {
		const role = source === 'user' ? 'You' : 'Claude'
		const cls = source === 'user' ? 'human' : 'claude'
		html += `<article class="${cls}" data-role="${source}">\n<div class="role">${role}</div>\n<div class="content">${esc(message)}</div>\n</article>\n`
	})
	html += `</body>\n</html>`
	return html
}

function convertToRTF(title, messages) {
	function escapeRTF(str) {
		return str
			.replace(/\\/g, '\\\\')
			.replace(/\{/g, '\\{')
			.replace(/\}/g, '\\}')
			.replace(/[\u0080-\uffff]/g, (c) => '\\u' + c.charCodeAt(0) + '?')
	}

	function stripMarkdown(str) {
		return str
			.replace(/```[\s\S]*?```/g, (match) =>
				match.replace(/```\w*\n?/g, '').trim()
			)
			.replace(/`([^`]+)`/g, '$1')
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/\*([^*]+)\*/g, '$1')
			.replace(/#{1,6}\s/g, '')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
	}

	let rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}{\\f1 Consolas;}}\n'
	rtf += '{\\colortbl;\\red217\\green119\\blue87;\\red100\\green100\\blue100;}\n'
	rtf += '\\f0\\fs24\n'
	rtf += '{\\b\\fs36 ' + escapeRTF(title) + '}\\par\\par\n'

	messages.forEach(({ source, message }) => {
		const role = source === 'user' ? 'Human' : 'Claude'
		const color = source === 'user' ? '\\cf2' : '\\cf1'
		rtf += '{' + color + '\\b\\fs26 ' + role + '}\\cf0\\par\n'
		const lines = stripMarkdown(message).split('\n')
		lines.forEach((line) => {
			rtf += escapeRTF(line) + '\\par\n'
		})
		rtf += '\\par\n'
	})

	rtf += '}'
	return rtf
}

// --- Minimal ZIP builder for DOCX generation ---

let _crc32Table = null
function getCRC32Table() {
	if (_crc32Table) return _crc32Table
	_crc32Table = new Uint32Array(256)
	for (let i = 0; i < 256; i++) {
		let c = i
		for (let j = 0; j < 8; j++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		}
		_crc32Table[i] = c
	}
	return _crc32Table
}

function crc32(data) {
	let crc = 0xffffffff
	const table = getCRC32Table()
	for (let i = 0; i < data.length; i++) {
		crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff]
	}
	return (crc ^ 0xffffffff) >>> 0
}

function createMinimalZip(files) {
	const encoder = new TextEncoder()
	const parts = []
	const centralHeaders = []
	let offset = 0

	files.forEach((file) => {
		const nameBytes = encoder.encode(file.name)
		const data = file.content
		const crc = crc32(data)

		// Local file header (30 bytes + filename)
		const local = new Uint8Array(30 + nameBytes.length)
		const lv = new DataView(local.buffer)
		lv.setUint32(0, 0x04034b50, true)
		lv.setUint16(4, 20, true)
		lv.setUint16(6, 0, true)
		lv.setUint16(8, 0, true) // STORE
		lv.setUint16(10, 0, true)
		lv.setUint16(12, 0, true)
		lv.setUint32(14, crc, true)
		lv.setUint32(18, data.length, true)
		lv.setUint32(22, data.length, true)
		lv.setUint16(26, nameBytes.length, true)
		lv.setUint16(28, 0, true)
		local.set(nameBytes, 30)

		// Central directory entry (46 bytes + filename)
		const central = new Uint8Array(46 + nameBytes.length)
		const cv = new DataView(central.buffer)
		cv.setUint32(0, 0x02014b50, true)
		cv.setUint16(4, 20, true)
		cv.setUint16(6, 20, true)
		cv.setUint16(8, 0, true)
		cv.setUint16(10, 0, true)
		cv.setUint16(12, 0, true)
		cv.setUint16(14, 0, true)
		cv.setUint32(16, crc, true)
		cv.setUint32(20, data.length, true)
		cv.setUint32(24, data.length, true)
		cv.setUint16(28, nameBytes.length, true)
		cv.setUint16(30, 0, true)
		cv.setUint16(32, 0, true)
		cv.setUint16(34, 0, true)
		cv.setUint16(36, 0, true)
		cv.setUint32(38, 0, true)
		cv.setUint32(42, offset, true)
		central.set(nameBytes, 46)

		centralHeaders.push(central)
		parts.push(local, data)
		offset += local.length + data.length
	})

	const centralStart = offset
	let centralSize = 0
	centralHeaders.forEach((h) => (centralSize += h.length))

	// End of central directory (22 bytes)
	const eocd = new Uint8Array(22)
	const ev = new DataView(eocd.buffer)
	ev.setUint32(0, 0x06054b50, true)
	ev.setUint16(4, 0, true)
	ev.setUint16(6, 0, true)
	ev.setUint16(8, files.length, true)
	ev.setUint16(10, files.length, true)
	ev.setUint32(12, centralSize, true)
	ev.setUint32(16, centralStart, true)
	ev.setUint16(20, 0, true)

	const totalLength = offset + centralSize + 22
	const result = new Uint8Array(totalLength)
	let pos = 0
	parts.forEach((p) => {
		result.set(p, pos)
		pos += p.length
	})
	centralHeaders.forEach((h) => {
		result.set(h, pos)
		pos += h.length
	})
	result.set(eocd, pos)

	return result
}

function convertToDOCX(title, messages) {
	const encoder = new TextEncoder()

	function escapeXML(str) {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
	}

	function stripMarkdown(str) {
		return str
			.replace(/```[\s\S]*?```/g, (match) =>
				match.replace(/```\w*\n?/g, '').trim()
			)
			.replace(/`([^`]+)`/g, '$1')
			.replace(/\*\*([^*]+)\*\*/g, '$1')
			.replace(/\*([^*]+)\*/g, '$1')
			.replace(/#{1,6}\s/g, '')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
	}

	let paragraphs = ''

	// Title
	paragraphs += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="48"/></w:rPr><w:t xml:space="preserve">${escapeXML(title)}</w:t></w:r></w:p>`

	messages.forEach(({ source, message }) => {
		const role = source === 'user' ? 'Human' : 'Claude'
		const color = source === 'user' ? '666666' : 'D97757'

		// Role header
		paragraphs += `<w:p><w:r><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="28"/></w:rPr><w:t>${escapeXML(role)}</w:t></w:r></w:p>`

		// Message lines
		const lines = stripMarkdown(message).split('\n')
		lines.forEach((line) => {
			paragraphs += `<w:p><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXML(line)}</w:t></w:r></w:p>`
		})

		// Separator
		paragraphs += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>`
	})

	const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`

	const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

	const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`

	const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

	const files = [
		{ name: '[Content_Types].xml', content: encoder.encode(contentTypes) },
		{ name: '_rels/.rels', content: encoder.encode(rels) },
		{ name: 'word/document.xml', content: encoder.encode(documentXml) },
		{
			name: 'word/_rels/document.xml.rels',
			content: encoder.encode(wordRels)
		}
	]

	return createMinimalZip(files)
}

function sanitizeFilename(name) {
	return (
		name
			.replace(/[^a-z0-9_\-\s]/gi, '')
			.replace(/\s+/g, '_')
			.substring(0, 100) || 'conversation'
	)
}

function downloadFile(content, filename, mimeType) {
	const blob = new Blob([content], { type: mimeType })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

// --- UI injection ---

function injectStyles() {
	if (document.getElementById('sc-styles')) return
	const s = document.createElement('style')
	s.id = 'sc-styles'
	s.textContent = `
.sc-divider{width:1px;height:20px;margin:0 4px;background:var(--border-300, rgba(128,128,128,0.25));flex-shrink:0}
.sc-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:none;border-radius:6px;background:transparent;color:inherit;cursor:pointer;transition:background 0.1s}
.sc-icon-btn:hover{background:var(--bg-200, rgba(128,128,128,0.1))}
.sc-icon-btn:active{transform:scale(0.95)}
.sc-icon-btn svg{width:16px;height:16px;opacity:0.65}
.sc-icon-btn:hover svg{opacity:1}
.sc-icon-btn.sc-loading{opacity:0.4;pointer-events:none}
.sc-export-wrap{position:relative;display:inline-flex;align-items:center}
.sc-menu{position:absolute;top:calc(100% + 6px);right:0;border-radius:12px;padding:4px;z-index:50001;min-width:200px;display:none;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.sc-menu.sc-open{display:block}
.sc-menu[data-theme="light"]{background:rgba(255,255,255,0.95);border:1px solid rgba(0,0,0,0.1);box-shadow:0 8px 30px rgba(0,0,0,0.12);color:#333}
.sc-menu[data-theme="dark"]{background:rgba(40,40,40,0.95);border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 30px rgba(0,0,0,0.4);color:#e0e0e0}
.sc-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;background:none;border:none;color:inherit;font-size:13px;text-align:left;cursor:pointer;border-radius:8px;font-family:inherit;line-height:1.4}
.sc-menu[data-theme="light"] .sc-item:hover{background:rgba(0,0,0,0.06)}
.sc-menu[data-theme="dark"] .sc-item:hover{background:rgba(255,255,255,0.08)}
.sc-item svg{width:16px;height:16px;flex-shrink:0;opacity:0.55}
`
	document.head.appendChild(s)
}

function detectTheme() {
	const bg = getComputedStyle(document.body).backgroundColor
	const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/)
	if (!m) return 'light'
	const lum = (parseInt(m[1]) * 299 + parseInt(m[2]) * 587 + parseInt(m[3]) * 114) / 1000
	return lum < 128 ? 'dark' : 'light'
}

function injectButtons() {
	if (document.querySelector('.sc-divider')) return

	const actionsBar = document.querySelector('[data-testid="wiggle-controls-actions"]')
	if (!actionsBar) return

	injectStyles()

	const shareSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>'
	const downloadSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>'

	// --- Divider ---
	const divider = document.createElement('div')
	divider.className = 'sc-divider'

	// --- Share button (direct action, no dropdown) ---
	const shareBtn = document.createElement('button')
	shareBtn.type = 'button'
	shareBtn.className = 'sc-icon-btn'
	shareBtn.title = 'Share to ShareClaude'
	shareBtn.innerHTML = shareSVG

	shareBtn.addEventListener('click', async () => {
		const conversationId = getConversationId()
		if (!conversationId) { alert('Open a conversation first'); return }

		shareBtn.classList.add('sc-loading')
		const messages = await getConversationMessages({ organizationId, conversationId })
		if (!messages) { alert('Failed to get conversation messages'); shareBtn.classList.remove('sc-loading'); return }

		const shareURL = await getShareURL(messages)
		if (!shareURL) { alert('Failed to generate share URL'); shareBtn.classList.remove('sc-loading'); return }

		navigator.clipboard.writeText(shareURL)
		window.open(shareURL, '_blank')
		shareBtn.classList.remove('sc-loading')
	})

	// --- Download button (opens format picker dropdown) ---
	const exportWrap = document.createElement('div')
	exportWrap.className = 'sc-export-wrap'

	const dlBtn = document.createElement('button')
	dlBtn.type = 'button'
	dlBtn.className = 'sc-icon-btn'
	dlBtn.title = 'Export conversation'
	dlBtn.innerHTML = downloadSVG
	exportWrap.appendChild(dlBtn)

	const menu = document.createElement('div')
	menu.className = 'sc-menu'
	menu.dataset.theme = detectTheme()
	exportWrap.appendChild(menu)

	const formats = [
		{ label: 'Markdown (.md)', ext: 'md', convert: convertToMarkdown, mime: 'text/markdown' },
		{ label: 'Plain Text (.txt)', ext: 'txt', convert: convertToText, mime: 'text/plain' },
		{ label: 'HTML (.html)', ext: 'html', convert: convertToHTML, mime: 'text/html' },
		{ label: 'Word (.docx)', ext: 'docx', convert: convertToDOCX, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
		{ label: 'Rich Text (.rtf)', ext: 'rtf', convert: convertToRTF, mime: 'application/rtf' }
	]

	formats.forEach(({ label, ext, convert, mime }) => {
		const item = document.createElement('button')
		item.type = 'button'
		item.className = 'sc-item'
		item.innerHTML = downloadSVG + '<span>' + label + '</span>'
		item.addEventListener('click', async (e) => {
			e.stopPropagation()
			menu.classList.remove('sc-open')

			const conversationId = getConversationId()
			if (!conversationId) { alert('Open a conversation first'); return }

			dlBtn.classList.add('sc-loading')
			const messages = await getConversationMessages({ organizationId, conversationId })
			if (!messages) { alert('Failed to get conversation messages'); dlBtn.classList.remove('sc-loading'); return }

			const filename = sanitizeFilename(messages.title) + '.' + ext
			const content = convert(messages.title || 'Conversation', messages.content)
			downloadFile(content, filename, mime)
			dlBtn.classList.remove('sc-loading')
		})
		menu.appendChild(item)
	})

	dlBtn.addEventListener('click', (e) => {
		e.stopPropagation()
		menu.dataset.theme = detectTheme()
		menu.classList.toggle('sc-open')
	})

	document.addEventListener('click', (e) => {
		if (!exportWrap.contains(e.target)) menu.classList.remove('sc-open')
	})

	// Append: [native buttons] | [share] [download▾]
	actionsBar.appendChild(divider)
	actionsBar.appendChild(shareBtn)
	actionsBar.appendChild(exportWrap)
}

function monitorPageChanges() {
	const observer = new MutationObserver(() => {
		if (!document.querySelector('.sc-divider')) {
			injectButtons()
		}
	})
	observer.observe(document.body, { childList: true, subtree: true })
}

window.addEventListener('load', async () => {
	organizationId = await getOrganizationId()
	injectButtons()
	monitorPageChanges()
})
