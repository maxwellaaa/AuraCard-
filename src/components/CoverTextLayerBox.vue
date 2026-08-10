<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { CoverTextLayer } from '../composables/useCoverTextLayers'

const props = defineProps<{
  layer: CoverTextLayer
  selected: boolean
  editing: boolean
  exporting: boolean
  /** Canvas position (left/top/width %). */
  boxStyle: Record<string, string | number>
  /** fontSize / fontFamily / textAlign / color etc. — applied on content. */
  textStyle: Record<string, string | number>
}>()

const emit = defineEmits<{
  select: []
  'pointer-drag': [e: PointerEvent]
  'update:text': [text: string]
  'start-edit': []
  'end-edit': []
}>()

const contentRef = ref<HTMLElement | null>(null)

const boxStyleBound = computed(() => props.boxStyle)
const textStyleBound = computed(() => props.textStyle)

const syncDomText = () => {
  const el = contentRef.value
  if (!el) return
  if (document.activeElement === el) return
  if (el.innerText !== props.layer.text) {
    el.innerText = props.layer.text || ''
  }
}

onMounted(syncDomText)

watch(
  () => props.layer.text,
  () => {
    if (!props.editing) syncDomText()
  },
)

watch(
  () => props.editing,
  async (editing) => {
    if (!editing) {
      syncDomText()
      return
    }
    await nextTick()
    const el = contentRef.value
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  },
)

const onPointerDown = (e: PointerEvent) => {
  if (props.exporting) return
  if (props.editing) {
    e.stopPropagation()
    return
  }
  emit('select')
  emit('pointer-drag', e)
}

const onDblClick = (e: MouseEvent) => {
  e.stopPropagation()
  e.preventDefault()
  emit('select')
  emit('start-edit')
}

const onInput = () => {
  const el = contentRef.value
  if (!el) return
  emit('update:text', el.innerText)
}

const onBlur = () => {
  const el = contentRef.value
  if (el) emit('update:text', el.innerText)
  emit('end-edit')
}

const onContentKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault()
    contentRef.value?.blur()
  }
  e.stopPropagation()
}

const onContentPointerDown = (e: PointerEvent) => {
  if (props.editing) e.stopPropagation()
}
</script>

<template>
  <div
    class="coverTextLayer"
    :class="{
      'is-selected': selected && !exporting,
      'is-editing': editing && !exporting,
      'coverTextLayer--exporting': exporting,
    }"
    :style="boxStyleBound"
    @pointerdown="onPointerDown"
    @dblclick="onDblClick"
  >
    <div
      ref="contentRef"
      class="coverTextLayer__content"
      :style="textStyleBound"
      :contenteditable="editing && !exporting ? 'true' : 'false'"
      spellcheck="false"
      @input="onInput"
      @blur="onBlur"
      @keydown="onContentKeydown"
      @pointerdown="onContentPointerDown"
    />
    <div v-if="selected && !exporting" class="coverTextLayer__chrome" aria-hidden="true">
      <span class="coverTextLayer__handle coverTextLayer__handle--tl" />
      <span class="coverTextLayer__handle coverTextLayer__handle--tr" />
      <span class="coverTextLayer__handle coverTextLayer__handle--bl" />
      <span class="coverTextLayer__handle coverTextLayer__handle--br" />
    </div>
  </div>
</template>
