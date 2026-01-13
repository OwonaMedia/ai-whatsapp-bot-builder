'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface EmbedCodeGeneratorProps {
  botId: string;
  botName?: string;
}

type CodeLanguage = 
  | 'html' 
  | 'react' 
  | 'nextjs'
  | 'vue' 
  | 'angular' 
  | 'svelte'
  | 'vanilla-js' 
  | 'php'
  | 'python'
  | 'java'
  | 'go'
  | 'ruby'
  | 'nodejs'
  | 'iframe' 
  | 'wordpress' 
  | 'shopify'
  | 'django'
  | 'flask'
  | 'laravel'
  | 'spring';

interface CodeExample {
  language: CodeLanguage;
  name: string;
  description: string;
  code: string;
}

export default function EmbedCodeGenerator({ botId, botName }: EmbedCodeGeneratorProps) {
  const t = useTranslations('embed');
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('html');
  const [copied, setCopied] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true); // ✅ Einfach-Modus standardmäßig aktiv
  const [customization, setCustomization] = useState({
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    primaryColor: '#25D366',
    height: '500px',
    width: '350px',
  });

  const widgetUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://whatsapp.owona.de';

  // ✅ Embed-URL außerhalb der Funktion verfügbar machen
  const embedUrl = `${widgetUrl}/de/widget/embed?botId=${botId}`;

  const generateCode = (isSimple: boolean = false): CodeExample[] => {
    // ✅ Korrigiere: Route ist unter /[locale]/widget/embed, also /de/widget/embed
    const baseUrl = widgetUrl;
    const botNameSafe = botName?.replace(/['"]/g, '') || 'Chatbot';

    return [
      {
        language: 'html',
        name: 'HTML (Einfach)',
        description: 'Einfache HTML-Integration - einfach in den <body> Tag einfügen',
        code: `<!-- WhatsApp Bot Builder - ${botNameSafe} -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>`,
      },
      {
        language: 'react',
        name: 'React',
        description: 'React Component für Create React App, Vite, etc.',
        code: `import { useEffect } from 'react';

export default function ChatbotWidget() {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script');
    script.src = '${baseUrl}/widget.js';
    script.setAttribute('data-bot-id', '${botId}');
    document.body.appendChild(script);

    return () => {
      // Cleanup
      const widgetContainer = document.getElementById('bot-widget-container');
      if (widgetContainer) {
        widgetContainer.remove();
      }
      script.remove();
    };
  }, []);

  return null; // Widget wird direkt in DOM injiziert
}`,
      },
      {
        language: 'nextjs',
        name: 'Next.js',
        description: 'Next.js App Router oder Pages Router Integration',
        code: `// app/components/ChatbotWidget.tsx oder components/ChatbotWidget.tsx
'use client';

import { useEffect } from 'react';

export default function ChatbotWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${baseUrl}/widget.js';
    script.setAttribute('data-bot-id', '${botId}');
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const widgetContainer = document.getElementById('bot-widget-container');
      const scriptTag = document.querySelector(\`script[data-bot-id="${botId}"]\`);
      if (widgetContainer) widgetContainer.remove();
      if (scriptTag) scriptTag.remove();
    };
  }, []);

  return null;
}

// In app/layout.tsx oder _app.tsx einbinden:
// import ChatbotWidget from '@/components/ChatbotWidget';
// <ChatbotWidget />`,
      },
      {
        language: 'vue',
        name: 'Vue.js',
        description: 'Vue 3 Component mit Composition API',
        code: `<template>
  <!-- Widget wird automatisch geladen -->
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  const script = document.createElement('script');
  script.src = '${baseUrl}/widget.js';
  script.setAttribute('data-bot-id', '${botId}');
  document.body.appendChild(script);
});

onUnmounted(() => {
  const widgetContainer = document.getElementById('bot-widget-container');
  const script = document.querySelector(\`script[data-bot-id="${botId}"]\`);
  if (widgetContainer) widgetContainer.remove();
  if (script) script.remove();
});
</script>`,
      },
      {
        language: 'angular',
        name: 'Angular',
        description: 'Angular Component mit TypeScript',
        code: `import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-chatbot-widget',
  template: '<!-- Widget wird automatisch geladen -->',
})
export class ChatbotWidgetComponent implements OnInit, OnDestroy {
  private script?: HTMLScriptElement;

  ngOnInit() {
    this.script = document.createElement('script');
    this.script.src = '${baseUrl}/widget.js';
    this.script.setAttribute('data-bot-id', '${botId}');
    document.body.appendChild(this.script);
  }

  ngOnDestroy() {
    const widgetContainer = document.getElementById('bot-widget-container');
    if (widgetContainer) {
      widgetContainer.remove();
    }
    if (this.script) {
      this.script.remove();
    }
  }
}`,
      },
      {
        language: 'svelte',
        name: 'Svelte',
        description: 'Svelte Component mit SvelteKit Support',
        code: `<script>
  import { onMount, onDestroy } from 'svelte';

  let script;

  onMount(() => {
    script = document.createElement('script');
    script.src = '${baseUrl}/widget.js';
    script.setAttribute('data-bot-id', '${botId}');
    document.body.appendChild(script);
  });

  onDestroy(() => {
    const widgetContainer = document.getElementById('bot-widget-container');
    if (widgetContainer) widgetContainer.remove();
    if (script) script.remove();
  });
</script>

<!-- Widget wird automatisch geladen -->`,
      },
      {
        language: 'vanilla-js',
        name: 'Vanilla JavaScript',
        description: 'Reines JavaScript ohne Framework',
        code: `// Load widget dynamically
(function() {
  const script = document.createElement('script');
  script.src = '${baseUrl}/widget.js';
  script.setAttribute('data-bot-id', '${botId}');
  script.async = true;
  document.body.appendChild(script);
})();

// Optional: Remove widget
function removeChatbotWidget() {
  const widgetContainer = document.getElementById('bot-widget-container');
  const script = document.querySelector(\`script[data-bot-id="${botId}"]\`);
  if (widgetContainer) widgetContainer.remove();
  if (script) script.remove();
}`,
      },
      {
        language: 'iframe',
        name: isSimple ? 'WhatsApp Link' : 'iframe (Vollständig)',
        description: isSimple 
          ? 'Direkter WhatsApp-Link - einfach teilen oder als Button einbinden'
          : 'Vollständige iframe-Integration für maximale Isolation',
        code: isSimple
          ? `${embedUrl}

<!-- Als Button auf Ihrer Website: -->
<a href="${embedUrl}" 
   target="_blank" 
   style="display: inline-block; padding: 12px 24px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
  💬 Chat mit uns auf WhatsApp
</a>

<!-- Oder als einfacher Link: -->
<a href="${embedUrl}" target="_blank">
  WhatsApp Chat öffnen
</a>`
          : `<!-- iframe Integration -->
<iframe 
  src="${embedUrl}"
  width="${customization.width}"
  height="${customization.height}"
  frameborder="0"
  style="position: fixed; ${customization.position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : customization.position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : customization.position === 'top-right' ? 'top: 20px; right: 20px;' : 'top: 20px; left: 20px;'} z-index: 9999; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"
  allow="microphone; camera"
></iframe>`,
      },
      {
        language: 'wordpress',
        name: 'WordPress',
        description: 'WordPress Plugin oder Theme-Integration',
        code: `<!-- WordPress: In functions.php oder Plugin hinzufügen -->
<?php
function add_chatbot_widget() {
    ?>
    <script src="<?php echo esc_url('${baseUrl}/widget.js'); ?>" data-bot-id="<?php echo esc_attr('${botId}'); ?>"></script>
    <?php
}
add_action('wp_footer', 'add_chatbot_widget');
?>

<!-- Oder direkt in header.php vor </body> -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>`,
      },
      {
        language: 'shopify',
        name: 'Shopify',
        description: 'Shopify Theme Integration (theme.liquid)',
        code: `<!-- Shopify: In theme.liquid vor </body> Tag -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

<!-- Oder als Shopify App Snippet -->
{% comment %}
  Erstelle eine neue Snippet-Datei: snippets/chatbot-widget.liquid
  Dann füge in theme.liquid ein:
  {% render 'chatbot-widget' %}
{% endcomment %}`,
      },
      {
        language: 'php',
        name: 'PHP',
        description: 'PHP Integration für WordPress, Laravel, oder Plain PHP',
        code: `<?php
// PHP Integration
function add_chatbot_widget() {
    $bot_id = '${botId}';
    $widget_url = '${baseUrl}/widget.js';
    ?>
    <script src="<?php echo esc_url($widget_url); ?>" data-bot-id="<?php echo esc_attr($bot_id); ?>"></script>
    <?php
}
add_action('wp_footer', 'add_chatbot_widget'); // WordPress
// Oder direkt in Template: <?php add_chatbot_widget(); ?>
?>`,
      },
      {
        language: 'python',
        name: 'Python',
        description: 'Python Integration für Django, Flask, oder Plain Python',
        code: `# Python/Django Template
# In template.html vor </body> Tag:
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

# Oder in Django base.html:
{% load static %}
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

# Flask/Jinja2:
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>`,
      },
      {
        language: 'java',
        name: 'Java',
        description: 'Java Integration für Spring Boot, JSP, oder Servlets',
        code: `<!-- JSP (Java Server Pages) -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

<!-- Spring Boot Thymeleaf Template -->
<script th:src="@{${baseUrl}/widget.js}" data-bot-id="${botId}"></script>

<!-- Oder in Java Servlet Response -->
response.getWriter().println(
    "<script src=\\"${baseUrl}/widget.js\\" data-bot-id=\\"${botId}\\"></script>"
);`,
      },
      {
        language: 'go',
        name: 'Go',
        description: 'Go Integration für Gin, Echo, oder Standard Library',
        code: `// Go Template (html/template)
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

// Oder direkt in Go Handler:
func chatbotWidget(w http.ResponseWriter, r *http.Request) {
    botID := "${botId}"
    widgetURL := "${baseUrl}/widget.js"
    html := fmt.Sprintf(
        "<script src=\\"%s\\" data-bot-id=\\"%s\\"></script>",
        widgetURL, botID,
    )
    w.Write([]byte(html))
}`,
      },
      {
        language: 'ruby',
        name: 'Ruby',
        description: 'Ruby Integration für Rails, Sinatra, oder Plain Ruby',
        code: `<!-- Ruby on Rails (ERB Template) -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

<!-- Oder in Rails Application Layout (app/views/layouts/application.html.erb) -->
<%= javascript_include_tag "${baseUrl}/widget.js", data: { bot_id: "${botId}" } %>

<!-- Sinatra -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>`,
      },
      {
        language: 'nodejs',
        name: 'Node.js',
        description: 'Node.js Integration für Express, Koa, oder Plain Node',
        code: `// Node.js/Express
// In EJS Template:
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

// Oder in Express Route:
app.get('/', (req, res) => {
  res.send(\`
    <html>
      <body>
        <script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>
      </body>
    </html>
  \`);
});

// Handlebars/Mustache:
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>`,
      },
      {
        language: 'django',
        name: 'Django',
        description: 'Django Template Integration',
        code: `<!-- Django Template (base.html oder page.html) -->
{% load static %}
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

<!-- Oder mit Django Template Tags -->
<script src="{% static 'widget.js' %}" data-bot-id="${botId}"></script>
<!-- Hinweis: Widget.js muss über CDN geladen werden: ${baseUrl}/widget.js -->`,
      },
      {
        language: 'flask',
        name: 'Flask',
        description: 'Flask/Jinja2 Template Integration',
        code: `<!-- Flask Template (base.html oder page.html) -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

<!-- Oder in Flask Route -->
@app.route('/')
def index():
    return render_template('index.html', bot_id='${botId}', widget_url='${baseUrl}/widget.js')

<!-- In template.html: -->
<script src="{{ widget_url }}" data-bot-id="{{ bot_id }}"></script>`,
      },
      {
        language: 'laravel',
        name: 'Laravel',
        description: 'Laravel Blade Template Integration',
        code: `<!-- Laravel Blade Template (resources/views/layouts/app.blade.php) -->
<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>

<!-- Oder mit Laravel Asset Helper -->
<script src="{{ asset('${baseUrl}/widget.js') }}" data-bot-id="${botId}"></script>

<!-- In Controller: -->
return view('welcome', ['botId' => '${botId}']);`,
      },
      {
        language: 'spring',
        name: 'Spring Boot',
        description: 'Spring Boot mit Thymeleaf oder JSP',
        code: `<!-- Spring Boot Thymeleaf Template -->
<script th:src="@{${baseUrl}/widget.js}" data-bot-id="${botId}"></script>

<!-- Oder in Controller -->
@Controller
public class HomeController {
    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("botId", "${botId}");
        model.addAttribute("widgetUrl", "${baseUrl}/widget.js");
        return "home";
    }
}

<!-- In home.html: -->
<script th:src="@{${widgetUrl}}" th:attr="data-bot-id=${botId}"></script>`,
      },
    ];
  };

  const codeExamples = generateCode(simpleMode);
  const currentCode = codeExamples.find(ex => ex.language === selectedLanguage)?.code || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      addToast({
        type: 'success',
        title: t('copySuccess') || 'Kopiert!',
        message: t('copyMessage') || 'Code wurde in die Zwischenablage kopiert.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: t('copyError') || 'Code konnte nicht kopiert werden.',
      });
    }
  };

  // Einfache Plattformen für normale Nutzer
  const simplePlatforms: { value: CodeLanguage; label: string; icon: string; description: string }[] = [
    { value: 'html', label: 'Website', icon: '🌐', description: 'Für jede normale Website' },
    { value: 'wordpress', label: 'WordPress', icon: '📝', description: 'WordPress-Website oder Blog' },
    { value: 'shopify', label: 'Shopify', icon: '🛍️', description: 'Shopify Online-Shop' },
    { value: 'iframe', label: 'WhatsApp Link', icon: '💬', description: 'Direkter WhatsApp-Link' },
  ];

  // Alle Sprachen für Experten
  const allLanguages: { value: CodeLanguage; label: string; icon: string; category?: string }[] = [
    // Frontend Frameworks
    { value: 'html', label: 'HTML', icon: '🌐', category: 'Frontend' },
    { value: 'react', label: 'React', icon: '⚛️', category: 'Frontend' },
    { value: 'nextjs', label: 'Next.js', icon: '▲', category: 'Frontend' },
    { value: 'vue', label: 'Vue.js', icon: '💚', category: 'Frontend' },
    { value: 'angular', label: 'Angular', icon: '🅰️', category: 'Frontend' },
    { value: 'svelte', label: 'Svelte', icon: '🧡', category: 'Frontend' },
    { value: 'vanilla-js', label: 'JavaScript', icon: '📜', category: 'Frontend' },
    { value: 'iframe', label: 'iframe', icon: '🔲', category: 'Frontend' },
    // Backend Languages
    { value: 'php', label: 'PHP', icon: '🐘', category: 'Backend' },
    { value: 'python', label: 'Python', icon: '🐍', category: 'Backend' },
    { value: 'java', label: 'Java', icon: '☕', category: 'Backend' },
    { value: 'go', label: 'Go', icon: '🐹', category: 'Backend' },
    { value: 'ruby', label: 'Ruby', icon: '💎', category: 'Backend' },
    { value: 'nodejs', label: 'Node.js', icon: '🟢', category: 'Backend' },
    // Frameworks
    { value: 'django', label: 'Django', icon: '🎸', category: 'Framework' },
    { value: 'flask', label: 'Flask', icon: '🍶', category: 'Framework' },
    { value: 'laravel', label: 'Laravel', icon: '🔴', category: 'Framework' },
    { value: 'spring', label: 'Spring Boot', icon: '🍃', category: 'Framework' },
    // CMS/Platforms
    { value: 'wordpress', label: 'WordPress', icon: '📝', category: 'CMS' },
    { value: 'shopify', label: 'Shopify', icon: '🛍️', category: 'CMS' },
  ];

  const languages = simpleMode ? simplePlatforms.map(p => ({ ...p, category: 'Simple' })) : allLanguages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('title') || 'Bot einbinden'}
          </h3>
          <p className="text-sm text-gray-600">
            {simpleMode 
              ? 'Wählen Sie Ihre Plattform aus und kopieren Sie den Code. Fertig! 🎉'
              : 'Integrieren Sie Ihren Bot in Ihre Website oder Anwendung mit einem einfachen Code-Snippet.'}
          </p>
        </div>
        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Einfach</span>
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              simpleMode ? 'bg-brand-green' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                simpleMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs text-gray-500">Experten</span>
        </div>
      </div>

      {/* Language Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {simpleMode 
            ? '📱 Wählen Sie Ihre Plattform aus:'
            : t('selectLanguage') || 'Code-Sprache / Plattform auswählen'}
        </label>
        
        {simpleMode ? (
          // Einfacher Modus: Große, benutzerfreundliche Karten
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simplePlatforms.map((platform) => (
              <button
                key={platform.value}
                onClick={() => setSelectedLanguage(platform.value)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedLanguage === platform.value
                    ? 'border-brand-green bg-brand-green/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{platform.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{platform.label}</h4>
                    <p className="text-sm text-gray-600">{platform.description}</p>
                  </div>
                  {selectedLanguage === platform.value && (
                    <span className="text-brand-green text-xl">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          // Experten-Modus: Kategorisiert
          <div className="space-y-4">
            {['Frontend', 'Backend', 'Framework', 'CMS'].map((category) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {allLanguages
                    .filter((lang) => lang.category === category)
                    .map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setSelectedLanguage(lang.value)}
                        className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          selectedLanguage === lang.value
                            ? 'border-brand-green bg-brand-green/10 text-brand-green'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-base mr-1">{lang.icon}</span>
                        {lang.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Example Info */}
      {codeExamples.find(ex => ex.language === selectedLanguage) && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-1">
            {codeExamples.find(ex => ex.language === selectedLanguage)?.name}
          </h4>
          <p className="text-sm text-blue-800">
            {codeExamples.find(ex => ex.language === selectedLanguage)?.description}
          </p>
        </div>
      )}

      {/* Code Display */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('codeLabel') || 'Code'}
          </label>
          <Button
            variant="outline"
            onClick={handleCopy}
            size="sm"
          >
            {copied ? '✓ ' + (t('copied') || 'Kopiert') : '📋 ' + (t('copy') || 'Kopieren')}
          </Button>
        </div>
        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
          <code>{currentCode}</code>
        </pre>
      </div>

      {/* Installation Instructions */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">
          {t('installationTitle') || '📦 So funktioniert\'s:'}
        </h4>
        {simpleMode ? (
          <div className="space-y-3">
            {selectedLanguage === 'html' && (
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Öffnen Sie Ihre Website im Editor (z.B. WordPress, Wix, Squarespace)</li>
                <li>Kopieren Sie den Code oben</li>
                <li>Fügen Sie ihn vor dem schließenden <code className="bg-green-100 px-1 rounded">&lt;/body&gt;</code> Tag ein</li>
                <li>Speichern Sie die Seite - fertig! 🎉</li>
              </ol>
            )}
            {selectedLanguage === 'wordpress' && (
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Loggen Sie sich in Ihr WordPress-Dashboard ein</li>
                <li>Gehen Sie zu <strong>Design → Theme-Editor</strong> oder installieren Sie ein Plugin wie "Insert Headers and Footers"</li>
                <li>Kopieren Sie den Code oben</li>
                <li>Fügen Sie ihn in den Footer-Bereich ein (vor <code className="bg-green-100 px-1 rounded">&lt;/body&gt;</code>)</li>
                <li>Speichern Sie - fertig! 🎉</li>
              </ol>
            )}
            {selectedLanguage === 'shopify' && (
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Loggen Sie sich in Ihr Shopify Admin ein</li>
                <li>Gehen Sie zu <strong>Online Store → Themes → Actions → Edit code</strong></li>
                <li>Öffnen Sie <code className="bg-green-100 px-1 rounded">theme.liquid</code></li>
                <li>Kopieren Sie den Code oben</li>
                <li>Fügen Sie ihn vor dem schließenden <code className="bg-green-100 px-1 rounded">&lt;/body&gt;</code> Tag ein</li>
                <li>Speichern Sie - fertig! 🎉</li>
              </ol>
            )}
            {selectedLanguage === 'iframe' && (
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Kopieren Sie den Link oben</li>
                <li>Fügen Sie ihn als Button oder Link auf Ihrer Website ein</li>
                <li>Oder teilen Sie den Link direkt mit Ihren Kunden</li>
                <li>Beim Klick öffnet sich WhatsApp mit Ihrem Bot - fertig! 🎉</li>
              </ol>
            )}
          </div>
        ) : (
          <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
            <li>{t('step1') || 'Kopiere den Code oben'}</li>
            <li>{t('step2') || 'Füge ihn in deine Website/Anwendung ein'}</li>
            <li>{t('step3') || 'Das Widget erscheint automatisch auf deiner Seite'}</li>
          </ol>
        )}
      </div>

      {/* Important Notes */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-900 mb-2">
          {t('noteTitle') || '⚠️ Wichtige Hinweise'}
        </h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
          <li>{t('note1') || 'Stelle sicher, dass dein Bot aktiv ist'}</li>
          <li>{t('note2') || 'Der Bot muss mindestens einen aktiven Flow haben'}</li>
          <li>{t('note3') || 'Für Production: Ersetze die URL mit deiner eigenen Domain'}</li>
        </ul>
      </div>

      {/* Test Links */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">
          {t('testTitle') || '🧪 Test'}
        </h4>
        <p className="text-sm text-gray-700 mb-2">
          {t('testDescription') || 'Teste das Widget:'}
        </p>
        <div className="flex flex-col gap-2">
          {/* WhatsApp Link Test */}
          {selectedLanguage === 'iframe' && (
            <button
              type="button"
              onClick={() => {
                // ✅ WhatsApp-Link öffnen - Embed-Seite
                const url = `${widgetUrl}/de/widget/embed?botId=${botId}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center justify-center px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
        >
              💬 WhatsApp-Link öffnen →
            </button>
          )}
          {/* Test-Seite Link */}
          <button
            type="button"
            onClick={() => {
              // ✅ Test-Seite öffnen - test-widget.html
              const url = `${widgetUrl}/test-widget.html?bot-id=${botId}`;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            🧪 Test-Seite öffnen →
          </button>
        </div>
      </div>
    </div>
  );
}
