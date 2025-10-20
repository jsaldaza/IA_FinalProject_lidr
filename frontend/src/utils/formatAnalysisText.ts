/**
 * Formatea el texto del levantamiento de requisitos convirtiéndolo en Markdown estructurado.
 * Identifica secciones como "Ambiguities", "Risks", "Edge Cases", etc. y las formatea adecuadamente.
 * 
 * @param text El texto plano del levantamiento de requisitos
 * @returns El mismo texto formateado como Markdown estructurado
 */
export function formatAnalysisText(text: string): string {
    if (!text) return '';

    // Crear una copia del texto para trabajar con él
    let formatted = text;

    // Formatear secciones principales - convertir el texto plano a estructura Markdown
    formatted = formatted.replace(/(\d+)\.\s+\*\*([^*]+)\*\*:?/g, '\n\n## $1. $2\n');
    
    // Convertir el levantamiento principal a título H1
    formatted = formatted.replace(/###\s+Analysis of the Requirement/g, '# Levantamiento de Requisitos');
    
    // Añadir saltos de línea entre puntos para mejorar legibilidad
    formatted = formatted.replace(/\. ([A-Z])/g, '.\n\n$1');
    
    // Formatear ítems de lista (convertir guiones sin salto de línea previo a lista con salto)
    formatted = formatted.replace(/([^\n])(- )/g, '$1\n\n$2');
    
    // Destacar términos importantes
    const termsToHighlight = [
        'no se especifica', 'no está claro', 'ambigüedad', 'riesgo', 
        'falta de', 'ausencia de', 'seguridad', 'validación'
    ];
    
    termsToHighlight.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        formatted = formatted.replace(regex, '**$1**');
    });
    
    // Formatear sección de preguntas
    formatted = formatted.replace(/(Questions and Missing Information)/g, '\n\n## Preguntas Pendientes\n');
    
    // Formatear subsecciones
    formatted = formatted.replace(/- ([^:]+):/g, '- **$1:**');
    
    // Convertir puntos específicos numerados en listas ordenadas
    formatted = formatted.replace(/(\d+)\. ([A-Z])/g, '\n$1. $2');
    
    return formatted;
}
