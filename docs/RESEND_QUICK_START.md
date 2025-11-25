# Resend - Guía Rápida

## Configuración en 5 minutos

### 1. Crear cuenta y obtener API Key
- Ve a [resend.com](https://resend.com) y crea cuenta
- Ve a **API Keys** → **Create API Key**
- Copia tu API Key (ej: `re_1234567890abcdef`)

### 2. Configurar en Supabase

Ve a **Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**

```
SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP User: resend
SMTP Password: [Tu API Key de Resend]
Sender Email: noreply@resend.dev (para pruebas)
Sender Name: LoopHub
```

### 3. Habilitar confirmación de email

En **Authentication** → **Settings**, activa **"Enable email confirmations"**

### 4. Probar

1. Crea una cuenta nueva en tu app
2. Revisa tu email (y spam)
3. Confirma tu cuenta

## Para Producción

1. En Resend, agrega tu dominio (ej: `mail.tudominio.com`)
2. Configura los registros DNS que Resend te proporciona
3. Cambia `Sender Email` a `noreply@tudominio.com` en Supabase

## Límites Gratuitos

- 3,000 emails/mes
- 100 emails/día
- Perfecto para empezar

---

**Guía completa**: [RESEND_SETUP.md](./RESEND_SETUP.md)

