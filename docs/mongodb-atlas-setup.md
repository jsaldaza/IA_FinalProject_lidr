# 🗄️ GUÍA: Configurar MongoDB Atlas (Base de Datos)

## 📋 Paso a Paso

### 1️⃣ Crear Cuenta en MongoDB Atlas
1. Ve a: https://www.mongodb.com/cloud/atlas
2. Clic en "Try Free"
3. Registrate con email o GitHub
4. Verifica tu email

### 2️⃣ Crear tu Primer Cluster
1. En el dashboard, clic "Build a Database"
2. Selecciona **"M0 Sandbox"** (GRATUITO)
3. Provider: **AWS** 
4. Region: **N. Virginia (us-east-1)** (más cercana)
5. Cluster Name: **"testforge-cluster"**
6. Clic "Create"

### 3️⃣ Configurar Acceso
1. **Database Access**:
   - Clic "Database Access" en sidebar
   - "Add New Database User"
   - Username: `testforge`
   - Password: Genera una segura (guárdala)
   - Database User Privileges: "Read and write to any database"
   - Clic "Add User"

2. **Network Access**:
   - Clic "Network Access" en sidebar
   - "Add IP Address"
   - Selecciona **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Descripción: "Development Access"
   - Clic "Confirm"

### 4️⃣ Obtener Connection String
1. Ve a "Database" en sidebar
2. Tu cluster estará listo en 1-3 minutos
3. Clic "Connect"
4. Selecciona "Connect your application"
5. Driver: **Node.js**
6. Version: **4.1 or later**
7. **Copia la connection string**:
   ```
   mongodb+srv://testforge:<password>@testforge-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 5️⃣ Configurar en tu Proyecto
1. Reemplaza `<password>` con tu password real
2. Añade el nombre de la database al final:
   ```
   mongodb+srv://testforge:tu-password@testforge-cluster.xxxxx.mongodb.net/testforge?retryWrites=true&w=majority
   ```
3. Úsala como **DATABASE_URL** en tus variables de entorno

## ✅ Verificación
- El cluster dice "Active" 
- Puedes conectarte desde tu app local
- Los datos se guardan correctamente

## 💡 Consejos
- **Guarda tu password** en un lugar seguro
- El tier gratuito incluye **512MB** de storage
- **Backups automáticos** incluidos
- Puedes **monitorear uso** en el dashboard