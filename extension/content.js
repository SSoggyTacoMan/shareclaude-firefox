const PAGE_URL = 'https://shareclaude.pages.dev'
const CLAUDE_API_URL = 'https://claude.ai/api/organizations'
let organizationId = ''

const shareIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`

const loaderSVG = `<svg width="20px" height="20px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" class="animate-spin text-white"><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"/><path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"/></g></svg>`

const downloadIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`

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
<title>${esc(title)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #1a1a1a; color: #e0e0e0; }
h1 { border-bottom: 2px solid #d97757; padding-bottom: 12px; color: #fff; }
.message { margin: 20px 0; padding: 16px; border-radius: 8px; }
.human { background: #2a2a2a; border-left: 3px solid #666; }
.claude { background: #252525; border-left: 3px solid #d97757; }
.role { font-weight: 700; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
.human .role { color: #999; }
.claude .role { color: #d97757; }
.content { white-space: pre-wrap; line-height: 1.6; }
pre { background: #111; padding: 12px; border-radius: 6px; overflow-x: auto; }
code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 13px; }
</style>
</head>
<body>
<h1>${esc(title)}</h1>\n`

	messages.forEach(({ source, message }) => {
		const role = source === 'user' ? 'Human' : 'Claude'
		const cls = source === 'user' ? 'human' : 'claude'
		html += `<div class="message ${cls}">\n<div class="role">${role}</div>\n<div class="content">${esc(message)}</div>\n</div>\n`
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

const BUTTON_CLASS =
	'inline-flex items-center justify-center relative shrink-0 ring-offset-2 ring-offset-bg-300 ring-accent-main-100 focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-200 border-transparent transition-colors font-styrene active:bg-bg-400 hover:bg-bg-500/40 hover:text-text-100 h-8 w-8 rounded-md active:scale-95 !rounded-lg'

function findToolbarAnchor() {
	return (
		document.querySelector('button[aria-label="Upload content"]') ||
		document.querySelector('button[aria-label="Attach files"]') ||
		document.querySelector('button[aria-label="Attach"]')
	)
}

function addShareButton() {
	const button = document.createElement('button')
	button.innerHTML = shareIconSVG
	button.className = BUTTON_CLASS
	button.type = 'button'
	button.title = 'Share conversation'
	button.ariaLabel = 'Share conversation'

	button.addEventListener('click', async () => {
		const conversationId = getConversationId()
		if (!conversationId) {
			alert('You need to go to a conversation to share it')
			return
		}

		button.innerHTML = loaderSVG
		button.disabled = true

		const messages = await getConversationMessages({
			organizationId,
			conversationId
		})
		if (!messages) {
			alert('Failed to get conversation messages')
			button.innerHTML = shareIconSVG
			button.disabled = false
			return
		}

		const shareURL = await getShareURL(messages)
		if (!shareURL) {
			alert('Failed to generate share URL')
			button.innerHTML = shareIconSVG
			button.disabled = false
			return
		}

		navigator.clipboard.writeText(shareURL)
		window.open(shareURL, '_blank')

		// Reset button after the action
		button.innerHTML = shareIconSVG
		button.disabled = false
	})

	const uploadButton = findToolbarAnchor()
	if (uploadButton && !document.querySelector('.share-button')) {
		button.classList.add('share-button')
		uploadButton.parentElement.appendChild(button)
	}
}

function addExportButton() {
	const uploadButton = findToolbarAnchor()
	if (!uploadButton || document.querySelector('.export-button-wrapper')) return

	const button = document.createElement('button')
	button.innerHTML = downloadIconSVG
	button.className = BUTTON_CLASS
	button.type = 'button'
	button.title = 'Export conversation'
	button.ariaLabel = 'Export conversation'

	// Dropdown menu
	const dropdown = document.createElement('div')
	dropdown.className = 'sc-export-dropdown'
	dropdown.style.cssText =
		'display:none;position:absolute;bottom:100%;right:0;margin-bottom:8px;background:#2a2a2a;border:1px solid #444;border-radius:8px;padding:4px;z-index:10000;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.4);'

	const formats = [
		{
			label: 'Markdown (.md)',
			ext: 'md',
			convert: convertToMarkdown,
			mime: 'text/markdown'
		},
		{
			label: 'Plain Text (.txt)',
			ext: 'txt',
			convert: convertToText,
			mime: 'text/plain'
		},
		{
			label: 'HTML (.html)',
			ext: 'html',
			convert: convertToHTML,
			mime: 'text/html'
		},
		{
			label: 'Word (.docx)',
			ext: 'docx',
			convert: convertToDOCX,
			mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		},
		{
			label: 'Rich Text (.rtf)',
			ext: 'rtf',
			convert: convertToRTF,
			mime: 'application/rtf'
		}
	]

	formats.forEach(({ label, ext, convert, mime }) => {
		const option = document.createElement('button')
		option.textContent = label
		option.type = 'button'
		option.style.cssText =
			'display:block;width:100%;padding:8px 12px;background:none;border:none;color:#e0e0e0;font-size:13px;text-align:left;cursor:pointer;border-radius:6px;'
		option.addEventListener('mouseenter', () => {
			option.style.background = '#3a3a3a'
		})
		option.addEventListener('mouseleave', () => {
			option.style.background = 'none'
		})
		option.addEventListener('click', async (e) => {
			e.stopPropagation()
			dropdown.style.display = 'none'

			const conversationId = getConversationId()
			if (!conversationId) {
				alert('You need to go to a conversation to export it')
				return
			}

			button.innerHTML = loaderSVG
			button.disabled = true

			const messages = await getConversationMessages({
				organizationId,
				conversationId
			})
			if (!messages) {
				alert('Failed to get conversation messages')
				button.innerHTML = downloadIconSVG
				button.disabled = false
				return
			}

			const filename = `${sanitizeFilename(messages.title)}.${ext}`
			const content = convert(
				messages.title || 'Conversation',
				messages.content
			)
			downloadFile(content, filename, mime)

			button.innerHTML = downloadIconSVG
			button.disabled = false
		})
		dropdown.appendChild(option)
	})

	// Wrapper for positioning
	const wrapper = document.createElement('div')
	wrapper.style.cssText = 'position:relative;display:inline-flex;'
	wrapper.classList.add('export-button-wrapper')
	wrapper.appendChild(button)
	wrapper.appendChild(dropdown)

	button.addEventListener('click', (e) => {
		e.stopPropagation()
		dropdown.style.display =
			dropdown.style.display === 'none' ? 'block' : 'none'
	})

	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		if (!wrapper.contains(e.target)) {
			dropdown.style.display = 'none'
		}
	})

	uploadButton.parentElement.appendChild(wrapper)
}

function monitorPageChanges() {
	const observer = new MutationObserver(() => {
		if (!document.querySelector('.share-button')) {
			addShareButton()
		}
		if (!document.querySelector('.export-button-wrapper')) {
			addExportButton()
		}
	})

	observer.observe(document.body, {
		childList: true,
		subtree: true
	})
}

window.addEventListener('load', async () => {
	organizationId = await getOrganizationId()
	addShareButton()
	addExportButton()
	monitorPageChanges()
})
