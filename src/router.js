import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './stores/auth'

const routes = [
  { path: '/', redirect: '/summary' },
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
  {
    path: '/summary',
    name: 'summary',
    component: () => import('./views/SummaryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reaffiliations',
    name: 'reaffiliations',
    component: () => import('./views/ReaffiliationsView.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/summary' }
]

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.isAuthenticated.value) {
    return { name: 'login', query: to.fullPath === '/summary' ? {} : { next: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated.value) return { name: 'summary' }
})
