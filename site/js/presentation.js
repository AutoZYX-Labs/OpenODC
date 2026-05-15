const app = document.querySelector('[data-deck-id]')
const stage = document.getElementById('deck-stage')
const slides = Array.from(document.querySelectorAll('[data-slide]'))
const prevBtn = document.getElementById('deck-prev')
const nextBtn = document.getElementById('deck-next')
const counter = document.getElementById('deck-counter')
const progress = document.getElementById('deck-progress-bar')
const themeSelect = document.getElementById('deck-theme')
const editBtn = document.getElementById('deck-edit')
const addTextBtn = document.getElementById('deck-add-text')
const addMediaBtn = document.getElementById('deck-add-media')
const mediaInput = document.getElementById('deck-media-input')
const resetBtn = document.getElementById('deck-reset')
const notesBtn = document.getElementById('deck-notes')
const exportBtn = document.getElementById('deck-export')
const fullscreenBtn = document.getElementById('deck-fullscreen')
const notesPanel = document.getElementById('deck-notes-panel')
const notesContent = document.getElementById('deck-notes-content')
const timing = document.getElementById('deck-timing')

const deckId = app?.dataset.deckId || 'openodc-deck'
const editStorageKey = `${deckId}:edits`
const customTextStorageKey = `${deckId}:custom-text`
const customMediaStorageKey = `${deckId}:custom-media`
const themeStorageKey = `${deckId}:theme:formal-template`
const isEnglish = document.documentElement.lang === 'en'
const fullscreenRevealMargin = 84
const defaultFullscreenSlideSize = { width: 1280, height: 720 }
let index = initialIndex()
let editMode = false
let edits = loadEdits()
let customTexts = loadCustomPayload(customTextStorageKey)
let customMedia = loadCustomPayload(customMediaStorageKey)
let fullscreenChromeTimer = null
let lastFullscreenPointerY = null
let fullscreenSlideSize = { ...defaultFullscreenSlideSize }
let pdfExportCleanupTimer = null
const defaultDocumentTitle = document.title

applySavedEdits()
renderCustomAddons()
applyTheme(localStorage.getItem(themeStorageKey) || stage?.dataset.theme || 'paper')
render()

prevBtn?.addEventListener('click', () => go(index - 1))
nextBtn?.addEventListener('click', () => go(index + 1))
themeSelect?.addEventListener('change', event => applyTheme(event.target.value))
editBtn?.addEventListener('click', toggleEditMode)
addTextBtn?.addEventListener('click', addCustomText)
addMediaBtn?.addEventListener('click', addCustomMedia)
mediaInput?.addEventListener('change', handleMediaFile)
resetBtn?.addEventListener('click', resetEdits)
notesBtn?.addEventListener('click', toggleNotes)
exportBtn?.addEventListener('click', exportPdf)
fullscreenBtn?.addEventListener('click', toggleFullscreen)
app?.addEventListener('pointermove', handleFullscreenPointer)
app?.addEventListener('pointerleave', () => {
  lastFullscreenPointerY = null
  scheduleFullscreenChromeHide(350)
})
app?.addEventListener('touchstart', revealFullscreenChrome)
document.addEventListener('fullscreenchange', syncFullscreenState)
window.addEventListener('resize', updateFullscreenSlideScale)
window.addEventListener('afterprint', finishPdfExport)

document.addEventListener('keydown', event => {
  const target = event.target
  const isEditingText = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
  if (isEditingText) return

  if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault()
    go(index + 1)
  } else if (['ArrowLeft', 'PageUp'].includes(event.key)) {
    event.preventDefault()
    go(index - 1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    go(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    go(slides.length - 1)
  } else if (event.key.toLowerCase() === 'f') {
    event.preventDefault()
    toggleFullscreen()
  } else if (event.key.toLowerCase() === 'e') {
    event.preventDefault()
    toggleEditMode()
  } else if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    toggleNotes()
  }
})

document.querySelectorAll('[data-edit-key]').forEach(node => {
  node.addEventListener('input', () => {
    if (!editMode) return
    edits[node.dataset.editKey] = node.innerHTML
    persistEdits()
  })
})

function initialIndex() {
  const match = window.location.hash.match(/slide-(\d+)/)
  if (!match) return 0
  const slideNumber = Number(match[1])
  if (!Number.isFinite(slideNumber)) return 0
  return Math.min(Math.max(slideNumber - 1, 0), slides.length - 1)
}

function go(nextIndex) {
  index = Math.min(Math.max(nextIndex, 0), slides.length - 1)
  render()
}

function render() {
  slides.forEach((slide, i) => {
    slide.classList.toggle('is-active', i === index)
    slide.setAttribute('aria-hidden', i === index ? 'false' : 'true')
  })
  counter.textContent = `${index + 1} / ${slides.length}`
  prevBtn.disabled = index === 0
  nextBtn.disabled = index === slides.length - 1
  progress.style.width = `${((index + 1) / slides.length) * 100}%`
  updateNotes()
  if (window.location.hash !== `#slide-${index + 1}`) {
    history.replaceState(null, '', `#slide-${index + 1}`)
  }
}

function updateNotes() {
  const active = slides[index]
  const source = active?.querySelector('.deck-notes-source')
  notesContent.innerHTML = source?.innerHTML || ''
  const prefix = isEnglish ? 'About ' : '约 '
  timing.textContent = `${prefix}${active?.dataset.timing || '1:00'}`
}

function applyTheme(theme) {
  stage.dataset.theme = theme
  if (themeSelect) themeSelect.value = theme
  localStorage.setItem(themeStorageKey, theme)
}

function toggleEditMode() {
  editMode = !editMode
  document.body.classList.toggle('deck-edit-mode', editMode)
  editBtn.textContent = editMode ? (isEnglish ? 'Done' : '完成') : (isEnglish ? 'Edit' : '微调')
  resetBtn.hidden = !editMode
  document.querySelectorAll('[data-edit-key]').forEach(node => {
    node.contentEditable = editMode ? 'true' : 'false'
    node.spellcheck = false
  })
  document.querySelectorAll('.custom-text-block').forEach(node => {
    node.contentEditable = editMode ? 'true' : 'false'
    node.spellcheck = false
  })
}

function toggleNotes() {
  notesPanel.hidden = !notesPanel.hidden
  app.classList.toggle('notes-open', !notesPanel.hidden)
  notesBtn.classList.toggle('is-active', !notesPanel.hidden)
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      captureFullscreenSlideSize()
      await document.querySelector('.deck-app').requestFullscreen()
    }
  } catch (error) {
    console.warn('Fullscreen unavailable', error)
  }
}

function syncFullscreenState() {
  const isFullscreen = document.fullscreenElement === app
  app?.classList.toggle('is-fullscreen', isFullscreen)
  document.body.classList.toggle('deck-fullscreen-active', isFullscreen)
  if (fullscreenBtn) fullscreenBtn.textContent = isFullscreen
    ? (isEnglish ? 'Exit Full Screen' : '退出全屏')
    : (isEnglish ? 'Full Screen' : '全屏')

  clearTimeout(fullscreenChromeTimer)
  if (isFullscreen) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    updateFullscreenSlideScale()
    requestAnimationFrame(updateFullscreenSlideScale)
  } else {
    app?.classList.remove('fullscreen-reveal-top', 'fullscreen-reveal-bottom')
    app?.style.removeProperty('--fullscreen-slide-scale')
    app?.style.removeProperty('--fullscreen-slide-width')
    app?.style.removeProperty('--fullscreen-slide-height')
  }
}

function captureFullscreenSlideSize() {
  if (!app) return
  fullscreenSlideSize = { ...defaultFullscreenSlideSize }
  app.style.setProperty('--fullscreen-slide-width', `${fullscreenSlideSize.width.toFixed(2)}px`)
  app.style.setProperty('--fullscreen-slide-height', `${fullscreenSlideSize.height.toFixed(2)}px`)
}

function updateFullscreenSlideScale() {
  if (!app || document.fullscreenElement !== app) return
  const defaultAspect = defaultFullscreenSlideSize.width / defaultFullscreenSlideSize.height
  const viewportAspect = window.innerWidth / window.innerHeight
  let width = defaultFullscreenSlideSize.width
  let height = defaultFullscreenSlideSize.height
  let scale = 1

  if (viewportAspect < defaultAspect) {
    height = width / viewportAspect
    scale = window.innerWidth / width
  } else {
    width = height * viewportAspect
    scale = window.innerHeight / height
  }

  fullscreenSlideSize = { width, height }
  app.style.setProperty('--fullscreen-slide-width', `${width.toFixed(2)}px`)
  app.style.setProperty('--fullscreen-slide-height', `${height.toFixed(2)}px`)
  app.style.setProperty('--fullscreen-slide-scale', `${Math.max(0.1, scale).toFixed(4)}`)
}

function handleFullscreenPointer(event) {
  if (document.fullscreenElement !== app) return
  lastFullscreenPointerY = event.clientY
  const nearTop = event.clientY <= fullscreenRevealMargin
  const nearBottom = event.clientY >= window.innerHeight - fullscreenRevealMargin

  app.classList.toggle('fullscreen-reveal-top', nearTop)
  app.classList.toggle('fullscreen-reveal-bottom', nearBottom)

  if (nearTop || nearBottom) {
    scheduleFullscreenChromeHide(2200)
  } else {
    scheduleFullscreenChromeHide(550)
  }
}

function revealFullscreenChrome() {
  if (document.fullscreenElement !== app) return
  app.classList.add('fullscreen-reveal-top', 'fullscreen-reveal-bottom')
  scheduleFullscreenChromeHide(1800)
}

function scheduleFullscreenChromeHide(delay = 900) {
  clearTimeout(fullscreenChromeTimer)
  fullscreenChromeTimer = setTimeout(() => {
    if (document.fullscreenElement !== app) return
    const nearTop = typeof lastFullscreenPointerY === 'number' && lastFullscreenPointerY <= fullscreenRevealMargin
    const nearBottom = typeof lastFullscreenPointerY === 'number' && lastFullscreenPointerY >= window.innerHeight - fullscreenRevealMargin
    if (nearTop || nearBottom) return
    const active = document.activeElement
    if (active && app.contains(active) && active.closest('.deck-topbar, .deck-bottom-bar')) return
    app.classList.remove('fullscreen-reveal-top', 'fullscreen-reveal-bottom')
  }, delay)
}

function loadEdits() {
  try {
    return JSON.parse(localStorage.getItem(editStorageKey) || '{}')
  } catch {
    return {}
  }
}

function applySavedEdits() {
  document.querySelectorAll('[data-edit-key]').forEach(node => {
    const saved = edits[node.dataset.editKey]
    if (saved) node.innerHTML = saved
  })
}

function persistEdits() {
  localStorage.setItem(editStorageKey, JSON.stringify(edits))
}

function resetEdits() {
  localStorage.removeItem(editStorageKey)
  localStorage.removeItem(customTextStorageKey)
  localStorage.removeItem(customMediaStorageKey)
  window.location.reload()
}

function slideKey(slide = slides[index]) {
  return slide?.dataset.slideKey || `slide-${index + 1}`
}

function loadCustomPayload(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function persistCustomPayload(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    return true
  } catch (error) {
    console.warn('Unable to persist custom deck content', error)
    alert(isEnglish
      ? 'The browser could not save this custom content. Use a smaller file or add it to the project assets.'
      : '浏览器无法保存这段自定义内容。请使用更小的文件，或把素材加入项目资源目录。')
    return false
  }
}

function addCustomText() {
  const text = prompt(isEnglish ? 'Text to add to the current slide:' : '请输入要添加到当前页的大段文字：')
  if (!text?.trim()) return
  const key = slideKey()
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    html: escapeHtml(text.trim()).replace(/\n/g, '<br>')
  }
  customTexts[key] = [...(customTexts[key] || []), item]
  if (persistCustomPayload(customTextStorageKey, customTexts)) renderCustomAddons()
}

function addCustomMedia() {
  const url = prompt(isEnglish
    ? 'Paste an image/video URL. Leave blank to choose a local file.'
    : '粘贴图片或视频 URL；留空则选择本地图片/视频文件。')
  if (url === null) return
  if (url.trim()) {
    addMediaItem(url.trim(), inferMediaType(url.trim()), 'url')
    return
  }
  mediaInput?.click()
}

function handleMediaFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.addEventListener('load', () => {
    addMediaItem(reader.result, file.type.startsWith('video/') ? 'video' : 'image', file.name)
    event.target.value = ''
  })
  reader.readAsDataURL(file)
}

function addMediaItem(src, type, name) {
  const key = slideKey()
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    src,
    name
  }
  customMedia[key] = [...(customMedia[key] || []), item]
  if (persistCustomPayload(customMediaStorageKey, customMedia)) renderCustomAddons()
}

function renderCustomAddons() {
  slides.forEach(slide => {
    slide.querySelector('[data-custom-slide-layer]')?.remove()
    const key = slideKey(slide)
    const textItems = customTexts[key] || []
    const mediaItems = customMedia[key] || []
    if (!textItems.length && !mediaItems.length) return

    const layer = document.createElement('div')
    layer.className = 'custom-slide-layer'
    layer.dataset.customSlideLayer = ''

    textItems.forEach(item => {
      const block = document.createElement('div')
      block.className = 'custom-text-block'
      block.dataset.customTextId = item.id
      block.innerHTML = item.html
      block.contentEditable = editMode ? 'true' : 'false'
      block.spellcheck = false
      block.addEventListener('input', () => {
        const currentKey = slideKey(slide)
        const list = customTexts[currentKey] || []
        const target = list.find(entry => entry.id === item.id)
        if (!target) return
        target.html = block.innerHTML
        persistCustomPayload(customTextStorageKey, customTexts)
      })
      layer.appendChild(block)
    })

    mediaItems.forEach(item => {
      const frame = document.createElement('figure')
      frame.className = 'custom-media-frame'
      const media = document.createElement(item.type === 'video' ? 'video' : 'img')
      media.src = item.src
      media.alt = item.name || 'custom media'
      if (item.type === 'video') media.controls = true
      frame.appendChild(media)
      layer.appendChild(frame)
    })

    slide.querySelector('.slide-standard')?.appendChild(layer)
  })
}

function inferMediaType(value) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(value) ? 'video' : 'image'
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function exportPdf() {
  if (exportBtn?.classList.contains('is-busy')) return

  if (document.fullscreenElement) {
    await document.exitFullscreen()
  }

  document.title = isEnglish ? 'OpenODC-20-minute-brief' : 'OpenODC-20分钟正式演示'
  document.body.classList.add('deck-printing')
  exportBtn?.classList.add('is-busy')
  if (exportBtn) exportBtn.textContent = isEnglish ? 'Preparing PDF...' : '准备 PDF...'

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      window.print()
      clearTimeout(pdfExportCleanupTimer)
      pdfExportCleanupTimer = window.setTimeout(finishPdfExport, 1500)
    }, 80)
  })
}

function finishPdfExport() {
  clearTimeout(pdfExportCleanupTimer)
  pdfExportCleanupTimer = null
  document.body.classList.remove('deck-printing')
  document.title = defaultDocumentTitle
  exportBtn?.classList.remove('is-busy')
  if (exportBtn) exportBtn.textContent = isEnglish ? 'Export PDF' : '导出 PDF'
}
