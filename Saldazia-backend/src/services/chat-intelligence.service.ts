/**
 * Servicio de Chat Inteligente para Levantamiento de Requerimientos
 * Proporciona respuestas estructuradas y guiadas para el análisis conversacional
 */

export class ChatIntelligenceService {
  
  /**
   * Genera el mensaje inicial del asistente para un nuevo proyecto
   */
  static generateWelcomeMessage(projectTitle: string): string {
    return `¡Hola! 👋 Soy tu asistente de análisis de requerimientos para el proyecto "${projectTitle}".

Mi objetivo es ayudarte a definir completamente los requisitos del sistema a través de una conversación estructurada. 

**¿Cómo funciona?**
📋 Te haré preguntas específicas para entender tu proyecto
🔍 Profundizaremos en aspectos técnicos y funcionales  
✅ Al final tendrás un análisis completo de requerimientos

**Para comenzar, me gustaría conocer:**

1️⃣ **¿Cuál es el propósito principal de "${projectTitle}"?**
   - ¿Qué problema específico busca resolver?
   - ¿Quiénes serán los usuarios finales?

2️⃣ **¿Puedes describir brevemente cómo imaginas que funcionaría?**

¡Cuéntame todos los detalles que consideres importantes! 🚀`;
  }

  /**
   * Genera preguntas de seguimiento basadas en el contexto
   */
  static generateFollowUpQuestions(_topic: string, context: string): string[] {
    const questionBank = {
      'authentication': [
        '¿Qué métodos de autenticación prefieres? (email/password, SSO, 2FA)',
        '¿Necesitas integración con sistemas externos de autenticación?',
        '¿Qué información debe capturarse durante el registro?'
      ],
      'database': [
        '¿Qué tipo de datos principales manejará el sistema?',
        '¿Necesitas reportes o analytics específicos?',
        '¿Hay requerimientos de backup o recuperación de datos?'
      ],
      'ui_ux': [
        '¿El sistema debe ser responsive (móvil, tablet, desktop)?',
        '¿Hay algún estilo o tema específico que prefieras?',
        '¿Los usuarios necesitan personalizar la interfaz?'
      ],
      'integration': [
        '¿Necesita integración con APIs externas? ¿Cuáles?',
        '¿El sistema debe exportar datos? ¿En qué formatos?',
        '¿Hay sistemas legados con los que debe conectarse?'
      ],
      'performance': [
        '¿Cuántos usuarios concurrentes esperas?',
        '¿Hay procesos que deben ejecutarse en background?',
        '¿Existen requerimientos de velocidad específicos?'
      ],
      'security': [
        '¿Qué nivel de seguridad requiere la información?',
        '¿Necesitas logs de auditoría?',
        '¿Hay regulaciones de compliance que cumplir?'
      ]
    };

    // Detectar temas en el contexto
    const detectedTopics = Object.keys(questionBank).filter(topic => 
      context.toLowerCase().includes(topic.replace('_', ' ')) ||
      context.toLowerCase().includes(topic)
    );

    if (detectedTopics.length === 0) {
      return [
        '¿Puedes detallar más sobre esta funcionalidad?',
        '¿Hay casos especiales o excepciones que deba considerar?',
        '¿Cómo debe comportarse el sistema en este escenario?'
      ];
    }

    return questionBank[detectedTopics[0] as keyof typeof questionBank] || [];
  }

  /**
   * Analiza el contenido del usuario y sugiere el siguiente paso
   */
  static analyzeUserInput(message: string): {
    topics: string[];
    completeness: number;
    suggestedQuestions: string[];
    phase: 'initial' | 'functional' | 'technical' | 'validation';
  } {
    const functionalKeywords = ['usuario', 'función', 'hacer', 'necesito', 'quiero', 'debe', 'funcionalidad'];
    const technicalKeywords = ['base de datos', 'api', 'servidor', 'tecnología', 'framework', 'integración'];
    const validationKeywords = ['validar', 'verificar', 'restricción', 'regla', 'error', 'excepción'];

    const topics = [];
    let completeness = 0;
    let phase: 'initial' | 'functional' | 'technical' | 'validation' = 'initial';

    // Detectar temas mencionados
    if (functionalKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      topics.push('functional_requirements');
      completeness += 25;
      phase = 'functional';
    }

    if (technicalKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      topics.push('technical_requirements');
      completeness += 25;
      phase = 'technical';
    }

    if (validationKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      topics.push('validation_requirements');
      completeness += 25;
      phase = 'validation';
    }

    // Calcular completeness basado en longitud y detalle
    const wordCount = message.trim().split(/\s+/).length;
    if (wordCount > 50) completeness += 20;
    if (wordCount > 100) completeness += 15;
    if (message.includes('?')) completeness += 10;

    const suggestedQuestions = this.generateFollowUpQuestions(topics[0] || 'general', message);

    return {
      topics,
      completeness: Math.min(completeness, 100),
      suggestedQuestions,
      phase
    };
  }

  /**
   * Genera respuesta contextual de la IA
   */
  static generateContextualResponse(analysis: ReturnType<typeof ChatIntelligenceService.analyzeUserInput>, userMessage: string): string {
    const { completeness, suggestedQuestions, phase } = analysis;

    let response = `Perfecto, entiendo que `;

    // Respuesta basada en la fase detectada
    switch (phase) {
      case 'functional':
        response += `estás definiendo las funcionalidades principales. `;
        break;
      case 'technical':
        response += `te enfocas en los aspectos técnicos del sistema. `;
        break;
      case 'validation':
        response += `estás considerando las validaciones y reglas de negocio. `;
        break;
      default:
        response += `estás proporcionando información valiosa sobre el proyecto. `;
    }

    // Agregar confirmación específica
    response += `\n\n✅ **He registrado:**\n`;
    response += `- ${this.extractKeyPoints(userMessage)}\n`;

    // Agregar preguntas de seguimiento
    response += `\n🤔 **Para profundizar más, me gustaría saber:**\n\n`;
    suggestedQuestions.slice(0, 3).forEach((question, index) => {
      response += `${index + 1}. ${question}\n`;
    });

    // Indicar progreso si está avanzado
    if (completeness > 60) {
      response += `\n📊 **Progreso del análisis: ${completeness}%**`;
      response += `\n\n🎯 ¡Excelente! Estamos avanzando bien. Con un poco más de información podremos generar el análisis completo.`;
    }

    return response;
  }

  /**
   * Extrae puntos clave del mensaje del usuario
   */
  private static extractKeyPoints(message: string): string {
    // Simplificado: toma las primeras 2-3 oraciones o hasta 100 caracteres
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoint = sentences[0]?.trim() || message.substring(0, 100);
    
    return keyPoint.length > 100 ? keyPoint.substring(0, 97) + '...' : keyPoint;
  }

  /**
   * Determina si el proyecto está listo para completarse
   */
  static isProjectReadyToComplete(messages: Array<{ role: string; content: string }>): {
    ready: boolean;
    reason: string;
    completeness: number;
  } {
    const userMessages = messages.filter(m => m.role === 'user');
    const totalWords = userMessages.reduce((acc, msg) => acc + msg.content.split(/\s+/).length, 0);
    
    let completeness = 0;
    let missingAspects = [];

    // Verificar aspectos clave
    const hasUsersOrRoles = userMessages.some(msg => 
      /usuarios?|roles?|perfiles?/i.test(msg.content)
    );
    
    const hasFunctionality = userMessages.some(msg => 
      /función|funcionalidad|hacer|proceso|flujo/i.test(msg.content)
    );
    
    const hasDataOrBusiness = userMessages.some(msg => 
      /datos?|información|negocio|reglas?/i.test(msg.content)
    );

    if (hasUsersOrRoles) completeness += 30; else missingAspects.push('usuarios y roles');
    if (hasFunctionality) completeness += 40; else missingAspects.push('funcionalidades principales');
    if (hasDataOrBusiness) completeness += 20; else missingAspects.push('reglas de negocio');
    if (totalWords > 200) completeness += 10; else missingAspects.push('más detalles');

    const ready = completeness >= 80;
    const reason = ready 
      ? '¡El proyecto tiene suficiente información para generar un análisis completo!'
      : `Faltan algunos aspectos: ${missingAspects.join(', ')}`;

    return { ready, reason, completeness };
  }

  /**
   * Genera mensaje de finalización cuando el proyecto está completo
   */
  static generateCompletionMessage(projectTitle: string): string {
    return `🎉 **¡Excelente trabajo!** 

He recopilado toda la información necesaria para "${projectTitle}". 

**✅ Análisis Completado:**
- Requisitos funcionales identificados
- Casos de uso definidos  
- Aspectos técnicos considerados
- Reglas de negocio establecidas

**📋 Tu proyecto ahora incluye:**
- Análisis detallado de requerimientos
- Casos de prueba sugeridos
- Documentación estructurada
- Recomendaciones técnicas

¿Te gustaría **completar el proyecto** para finalizar el análisis y generar la documentación completa? 

Una vez completado, podrás acceder a toda la documentación generada y los casos de prueba recomendados. 🚀`;
  }
}

export default ChatIntelligenceService;