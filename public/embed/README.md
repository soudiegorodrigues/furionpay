# Popup de Doação PIX - Guia de Integração

## Uso Standalone (HTML/CSS/JS)

O arquivo `donation-popup.html` contém todo o código necessário para usar o popup de doação. Ele inclui:

- HTML estruturado
- CSS com variáveis customizáveis
- JavaScript modular

### Como usar:

1. Copie o conteúdo do arquivo `donation-popup.html`
2. Cole no seu site onde deseja o botão de doação
3. Personalize as configurações no JavaScript

## Integração WordPress

### Opção 1: Shortcode (Recomendado)

Adicione este código no `functions.php` do seu tema:

```php
<?php
function donation_popup_shortcode($atts) {
    $atts = shortcode_atts(array(
        'recipient' => 'Davizinho',
        'auto_show_delay' => 0,
        'show_button' => 'true'
    ), $atts);
    
    ob_start();
    ?>
    <!-- Donation Popup Styles -->
    <style>
    /* Cole aqui o CSS do arquivo donation-popup.html */
    </style>
    
    <!-- Donation Popup HTML -->
    <?php if ($atts['show_button'] === 'true'): ?>
    <button class="dp-trigger" onclick="DonationPopup.open()">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        Doar Agora
    </button>
    <?php endif; ?>
    
    <div class="dp-overlay" id="dpOverlay">
        <!-- Cole aqui o conteúdo do modal -->
    </div>
    
    <script>
    // Cole aqui o JavaScript do arquivo donation-popup.html
    // Altere a configuração inicial:
    DonationPopup.init({
        recipientName: '<?php echo esc_js($atts['recipient']); ?>',
        autoShowDelay: <?php echo intval($atts['auto_show_delay']); ?>,
        pixEndpoint: '<?php echo admin_url('admin-ajax.php'); ?>?action=generate_pix'
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('donation_popup', 'donation_popup_shortcode');
```

Uso no editor:
```
[donation_popup recipient="Davizinho" auto_show_delay="3000"]
```

### Opção 2: Plugin Simples

Crie um arquivo `donation-popup.php` na pasta `wp-content/plugins/`:

```php
<?php
/**
 * Plugin Name: Donation Popup PIX
 * Description: Popup de doação via PIX
 * Version: 1.0
 */

// Enfileirar scripts e estilos
function dp_enqueue_scripts() {
    wp_enqueue_style('donation-popup', plugin_dir_url(__FILE__) . 'donation-popup.css');
    wp_enqueue_script('donation-popup', plugin_dir_url(__FILE__) . 'donation-popup.js', array(), '1.0', true);
    
    wp_localize_script('donation-popup', 'dpConfig', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('dp_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'dp_enqueue_scripts');

// Handler AJAX para gerar PIX
function dp_generate_pix() {
    check_ajax_referer('dp_nonce', 'nonce');
    
    $amount = floatval($_POST['amount']);
    $recipient = sanitize_text_field($_POST['recipient']);
    
    // Integre aqui com sua API PIX (ex: Mercado Pago, PagSeguro, etc.)
    // Exemplo de resposta:
    $pix_code = '00020126...'; // Código PIX real da sua integração
    $qr_code_url = 'https://...'; // URL do QR Code
    
    wp_send_json_success(array(
        'pixCode' => $pix_code,
        'qrCodeUrl' => $qr_code_url
    ));
}
add_action('wp_ajax_generate_pix', 'dp_generate_pix');
add_action('wp_ajax_nopriv_generate_pix', 'dp_generate_pix');

// Adicionar popup ao footer
function dp_add_popup_to_footer() {
    include plugin_dir_path(__FILE__) . 'popup-template.php';
}
add_action('wp_footer', 'dp_add_popup_to_footer');
```

## Configuração do Endpoint PIX

O popup espera uma resposta JSON do endpoint `/payments/pix` com:

```json
{
  "pixCode": "00020126580014br.gov.bcb.pix...",
  "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?data=..."
}
```

### Integrações populares:

**Mercado Pago:**
```javascript
pixEndpoint: 'https://api.mercadopago.com/v1/payments'
```

**PagSeguro:**
```javascript
pixEndpoint: 'https://ws.pagseguro.uol.com.br/pix/...'
```

**Gerencianet (EFÍ):**
```javascript
pixEndpoint: 'https://api-pix.gerencianet.com.br/...'
```

## Personalização

### Cores
Edite as variáveis CSS no início do arquivo:

```css
:root {
  --dp-primary: #22c55e;       /* Cor principal (verde) */
  --dp-primary-hover: #16a34a; /* Hover do botão */
  --dp-foreground: #1e293b;    /* Cor do texto */
  --dp-background: #ffffff;    /* Fundo do modal */
}
```

### Valores de Doação
Edite o array `amounts` na configuração:

```javascript
DonationPopup.init({
  amounts: [10, 20, 50, 100, 200, 500],
  mostChosen: 100,
  defaultSelected: 50
});
```

### Auto-show
Para mostrar automaticamente após X segundos:

```javascript
DonationPopup.init({
  autoShowDelay: 5000, // 5 segundos
  showOncePerSession: true
});
```

## Métodos Disponíveis

```javascript
DonationPopup.open()      // Abre o popup
DonationPopup.close()     // Fecha o popup
DonationPopup.back()      // Volta para seleção de valor
DonationPopup.generatePix() // Gera o código PIX
DonationPopup.copyCode()  // Copia código PIX
DonationPopup.init({...}) // Inicializa com configurações
```

## Exemplo de Botão Customizado

```html
<button onclick="DonationPopup.open()" style="your-custom-styles">
  Ajude nossa causa!
</button>
```
