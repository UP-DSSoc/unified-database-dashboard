<script setup>
/** Previous / Next pager for a paginated DataTable. Use with `v-model:page`. */
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, default: 1 },
})

const emit = defineEmits(['update:page'])
</script>

<template>
  <nav v-if="totalPages > 1" class="pager">
    <button class="btn btn-quiet" :disabled="page <= 1" @click="emit('update:page', page - 1)">
      Previous
    </button>
    <span class="figure">Page {{ page }} of {{ totalPages }}</span>
    <button
      class="btn btn-quiet"
      :disabled="page >= totalPages"
      @click="emit('update:page', page + 1)"
    >
      Next
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--slate);
}
</style>
