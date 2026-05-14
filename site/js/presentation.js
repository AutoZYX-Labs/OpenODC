const app = document.querySelector('[data-deck-id]')
const stage = document.getElementById('deck-stage')
const slides = Array.from(document.querySelectorAll('[data-slide]'))
const prevBtn = document.getElementById('deck-prev')
const nextBtn = document.getElementById('deck-next')
const counter = document.getElementById('deck-counter')
const progress = document.getElementById('deck-progress-bar')
const themeSelect = document.getElementById('deck-theme')
const editBtn = document.getElementById('deck-edit')
const resetBtn = document.getElementById('deck-reset')
const notesBtn = document.getElementById('deck-notes')
const fullscreenBtn = document.getElementById('deck-fullscreen')
const notesPanel = document.getElementById('deck-notes-panel')
const notesContent = document.getElementById('deck-notes-content')
const timing = document.getElementById('deck-timing')

const deckId = app?.dataset.deckId || 'openodc-deck'
const editStorageKey = `${deckId}:edits`
const themeStorageKey = `${deckId}:theme`
const isEnglish = document.documentElement.lang === 'en'
let index = initialIndex()
let editMode = false
let edits = loadEdits()

applySavedEdits()
applyTheme(localStorage.getItem(themeStorageKey) || 'paper')
render()

prevBtn?.addEventListener('click', () => go(index - 1))
nextBtn?.addEventListener('click', () => go(index + 1))
themeSelect?.addEventListener('change', event => applyTheme(event.target.value))
editBtn?.addEventListener('click', toggleEditMode)
resetBtn?.addEventListener('click', resetEdits)
notesBtn?.addEventListener('click', toggleNotes)
fullscreenBtn?.addEventListener('click', toggleFullscreen)

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
      await document.querySelector('.deck-app').requestFullscreen()
    }
  } catch (error) {
    console.warn('Fullscreen unavailable', error)
  }
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
  window.location.reload()
}
