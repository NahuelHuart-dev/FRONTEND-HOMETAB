import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import AboutView from '../views/AboutView.vue'
import LoginView from '../views/LoginView.vue'
import TabHubView from '../views/TabHubView.vue'
import RegisterView from '../views/RegisterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'landing', component: LandingView, meta: { title: 'HomeTab | Gestión sin dramas' } },
    { path: '/about', name: 'about', component: AboutView, meta: { title: 'HomeTab | About' } },
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'HomeTab | Login' } },
    { path: '/register', name: 'register', component: RegisterView, meta: { title: 'HomeTab | Registro' } },
    { path: '/legal', name: 'legal', component: () => import('../views/legal/LegalView.vue'), meta: { title: 'HomeTab | Aviso legal' } },
    { path: '/privacy', name: 'privacy', component: () => import('../views/legal/PrivacyView.vue'), meta: { title: 'HomeTab | Privacidad' } },
    { path: '/cookies', name: 'cookies', component: () => import('../views/legal/CookiesView.vue'), meta: { title: 'HomeTab | Cookies' } },
    { path: '/feedback', name: 'feedback', component: () => import('../views/FeedbackView.vue'), meta: { title: 'HomeTab | Feedback' } },
    { path: '/tabhub', name: 'tabhub', component: TabHubView, meta: { title: 'HomeTab | Mis Tabs' } },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { title: 'HomeTab | Mi Perfil' } },

    // --- RUTAS DE LA CASA ---
    {
      path: '/households/:id',
      component: () => import('../views/HouseholdLayoutView.vue'),
      // Redirigir al dashboard si alguien entra en /households/5 sin pestaña
      redirect: to => ({ path: `/households/${to.params.id}/dashboard` }),
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('../views/tabs/DashboardTab.vue'), meta: { title: 'HomeTab | Dashboard' } },
        { path: 'expenses', name: 'expenses', component: () => import('../views/tabs/ExpensesTab.vue'), meta: { title: 'HomeTab | Despeses' } },
        { path: 'tasks', name: 'tasks', component: () => import('../views/tabs/TasksTab.vue'), meta: { title: 'HomeTab | Tasques' } },
        { path: 'calendar', name: 'calendar', component: () => import('../views/tabs/CalendarTab.vue'), meta: { title: 'HomeTab | Calendari' } },
        { path: 'multimedia', name: 'multimedia', component: () => import('../views/tabs/MultimediaTab.vue'), meta: { title: 'HomeTab | Multimedia' } },
        { path: 'settings', name: 'settings', component: () => import('../views/tabs/SettingsTab.vue'), meta: { title: 'HomeTab | Configuració' } },
      ]
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'HomeTab | Página no encontrada' } }
  ]
})

export default router
