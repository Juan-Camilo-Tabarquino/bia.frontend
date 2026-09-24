# AI Energy Management Platform — Frontend Implementation Plan

## 1. Objetivo

Construir el frontend web de un MVP para monitorear y analizar el comportamiento energético de una instalación industrial. La aplicación debe consumir los datos y el análisis expuestos por la API REST del backend en Go.

### Alcance del Dataset

- **12 medidores eléctricos** (`M-101` a `M-112`)[cite: 1].
- **14 días de información** (~4.032 lecturas)[cite: 1].
- **Variables**: Consumo (`consumption_kwh`), Voltaje (`voltage_v`), Corriente (`current_a`), Factor de Potencia (`power_factor`)[cite: 1].

---

## 2. Principio Fundamental

> **El Frontend NO realiza la detección de anomalías ni los cálculos analíticos.**
> El backend en Go es responsable del pipeline determinista (Calidad de datos $\rightarrow$ Baseline $\rightarrow$ Detección $\rightarrow$ Correlación $\rightarrow$ Clasificación $\rightarrow$ Priorización $\rightarrow$ Investigación IA)[cite: 1]. El frontend consume y presenta estos resultados de forma interactiva y ejecutiva[cite: 1].

---

## 3. Stack Tecnológico

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript (Tipado estricto, sin `any`)
- **UI Components**: Ant Design (`antd`)
- **Estilos**: **SCSS / Sass Modules (`*.module.scss`)**
- **Gestión de Estado y API**: **Redux Toolkit & RTK Query (`@reduxjs/toolkit`, `react-redux`)**
- **Visualización de Datos**: Recharts
- **Gestion de paquetes**: **Yarn** (`yarn`)
- **Empaquetador**: **vite** (`vite`)

---

## 4. Estructura del Proyecto
