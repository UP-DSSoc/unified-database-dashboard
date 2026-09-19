<script setup>
import Account from '@/components/account/Account.vue'
import Profile from '@/components/account/Profile.vue'
</script>

<template>
  <div class="profile">
    <h1>Profile</h1>
    <Account />
    <Profile />
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
</style>
