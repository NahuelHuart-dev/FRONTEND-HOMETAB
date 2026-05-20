import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

const app = createApp(App)


// 1. Importar PrimeVue v4
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

// 2. Importar componentes de PrimeVue
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Card from 'primevue/card'
import FloatLabel from 'primevue/floatlabel'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'

// 3. Importar iconos
import 'primeicons/primeicons.css'


// 4. Configurar PrimeVue con el tema Aura
app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
})
app.use(ToastService)

// 5. Registrar componentes globalmente
app.component('Button', Button)
app.component('Dialog', Dialog)
app.component('InputText', InputText)
app.component('Password', Password)
app.component('Card', Card)
app.component('FloatLabel', FloatLabel)
app.component('Toast', Toast)

app.use(router)
app.use(i18n)

app.mount('#app')
