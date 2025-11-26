# Contribuir a LoopHub

¡Gracias por tu interés en contribuir a LoopHub! Este documento te guiará a través del proceso de contribución.

## Código de Conducta

Este proyecto se adhiere a un Código de Conducta estándar. Se espera que todos los colaboradores sean respetuosos y profesionales.

## Cómo empezar

1.  **Haz un Fork** del repositorio.
2.  **Clona** tu fork localmente:
    ```bash
    git clone https://github.com/tu-usuario/loophub.git
    cd loophub
    ```
3.  **Instala las dependencias**:
    ```bash
    npm install
    ```
4.  **Configura las variables de entorno**:
    Crea un archivo `.env.local` basado en el ejemplo del README.

## Flujo de Desarrollo

1.  Crea una nueva rama para tu feature o fix:
    ```bash
    git checkout -b feature/mi-nueva-feature
    ```
2.  Haz tus cambios. Asegúrate de seguir el estilo de código existente.
3.  Ejecuta el servidor de desarrollo para probar:
    ```bash
    npm run dev
    ```

## Estándares de Código

- **TypeScript**: Usa tipos explícitos siempre que sea posible. Evita `any`.
- **Componentes**: Usa componentes funcionales de React.
- **Estilos**: Usa Tailwind CSS para los estilos. Evita CSS personalizado en `globals.css` a menos que sea estrictamente necesario.
- **Commits**: Usa mensajes de commit descriptivos (e.g., "feat: agregar soporte para emojis", "fix: corregir error de paginación").

## Pull Requests

1.  Haz push de tu rama a tu fork:
    ```bash
    git push origin feature/mi-nueva-feature
    ```
2.  Abre un Pull Request en el repositorio original.
3.  Describe claramente tus cambios y por qué son necesarios.
4.  Adjunta capturas de pantalla si tus cambios afectan la interfaz de usuario.

¡Gracias por ayudar a mejorar LoopHub!
