import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'rp-formatter',
      component: () => import('@/features/rp-formatter/RpFormatterView.vue'),
      meta: {
        title: 'Formatador de RPs',
      },
    },
    {
      path: '/termo-merge',
      name: 'termo-merge',
      component: () => import('@/features/termo-merge/TermoMergeView.vue'),
      meta: {
        title: 'Termo Merge',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const pageTitle = typeof to.meta.title === 'string' ? to.meta.title : 'Utilitário de Patrimônio'
  document.title = `${pageTitle} | Utilitário de Patrimônio`
})

export default router
