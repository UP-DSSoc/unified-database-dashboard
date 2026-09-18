<script setup>
import { computed } from 'vue'
import { auth } from '../stores/auth'

const username = computed(() => auth.username.value)
const permissions = computed(() => auth.permissions.value)
const member = computed(() => auth.member.value)

function formatKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const memberEntries = computed(() => {
  if (!member.value || typeof member.value !== 'object') return []
  return Object.entries(member.value).filter(([, v]) => v !== null && v !== undefined && v !== '')
})
</script>

<template>
  <div class="profile">
    <h1>Profile</h1>

    <section class="panel account-section">
      <h2>Account</h2>
      <p class="panel-note">System credentials and access level.</p>
      <dl class="fields">
        <div class="field-row">
          <dt>Username</dt>
          <dd class="figure">{{ username }}</dd>
        </div>
        <div class="field-row">
          <dt>Permissions</dt>
          <dd>
            <span v-if="permissions.length" class="perm-list">
              <span v-for="p in permissions" :key="p" class="perm-chip figure">{{ p }}</span>
            </span>
            <span v-else class="muted">No permissions assigned</span>
          </dd>
        </div>
      </dl>
    </section>

    <section class="panel member-section">
      <h2>Member data</h2>
      <p class="panel-note">Information from the membership database linked to this account.</p>
      <dl v-if="memberEntries.length" class="fields">
        <div v-for="[key, value] in memberEntries" :key="key" class="field-row">
          <dt>{{ formatKey(key) }}</dt>
          <dd class="figure">{{ value }}</dd>
        </div>
      </dl>
      <p v-else class="muted">No member data available.</p>
    </section>
  </div>
</template>

<style scoped>
.profile {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile h1 {
  margin-bottom: 0.25rem;
}

.account-section,
.member-section {
  display: flex;
  flex-direction: column;
}

.fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.field-row {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
}

.field-row:last-child {
  border-bottom: none;
}

dt {
  font-size: 0.82rem;
  color: var(--slate);
}

dd {
  margin: 0;
  font-size: 0.9rem;
  word-break: break-word;
}

.perm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.perm-chip {
  font-size: 0.72rem;
  padding: 0.1rem 0.45rem;
  background: var(--canvas);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--ink);
}
</style>
