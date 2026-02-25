define(['jquery'], function ($) {
  var CustomWidget = function () {
    var self = this;
    var baseUrl = '';

    function getContactData() {
      var data = { kommoContactId: '', nome: '', telefone: '' };

      try {
        var cardData = AMOCRM.data.current_card || {};
        data.kommoContactId = cardData.id || '';

        var mainContact = cardData.main_contact || {};
        data.nome = mainContact.name || cardData.name || '';

        var customFields = mainContact.custom_fields || cardData.custom_fields || [];
        for (var i = 0; i < customFields.length; i++) {
          var field = customFields[i];
          if (field.code === 'PHONE' || field.name === 'Телефон' || field.name === 'Telefone' || field.name === 'Phone') {
            var vals = field.values || field.enums || [];
            if (vals.length > 0) {
              data.telefone = vals[0].value || vals[0] || '';
              break;
            }
          }
        }
      } catch (e) {
        console.warn('[Acolhimento] Erro ao extrair dados do contato:', e);
      }

      return data;
    }

    function buildIframeUrl(contactData) {
      var params = [
        'kommoContactId=' + encodeURIComponent(contactData.kommoContactId),
        'nome=' + encodeURIComponent(contactData.nome),
        'telefone=' + encodeURIComponent(contactData.telefone)
      ];
      return baseUrl + '/widget.html?' + params.join('&');
    }

    this.callbacks = {
      render: function () {
        baseUrl = self.params.base_url || self.get_settings().base_url || 'https://acolhimento-fase1.onrender.com';
        baseUrl = baseUrl.replace(/\/+$/, '');
        return true;
      },

      init: function () {
        var area = self.system().area;
        if (area !== 'ccard' && area !== 'lcard') {
          return true;
        }

        var contactData = getContactData();
        if (!contactData.kommoContactId) {
          return true;
        }

        var iframeUrl = buildIframeUrl(contactData);

        var $container = $('div.card-widgets__widget-' + self.get_widget_code());
        if ($container.length === 0) {
          $container = $('#' + self.get_widget_code());
        }

        var $wrapper = $container.find('.widget-body__acolhimento');
        if ($wrapper.length === 0) {
          $wrapper = $('<div>', { class: 'widget-body__acolhimento' });
          $container.find('.widget-body__widget').append($wrapper);
          if ($wrapper.parent().length === 0) {
            $container.append($wrapper);
          }
        }

        $wrapper.html(
          '<iframe ' +
            'src="' + iframeUrl + '" ' +
            'style="width:100%;height:320px;border:none;border-radius:8px;" ' +
            'allow="clipboard-write" ' +
          '></iframe>'
        );

        return true;
      },

      bind_actions: function () {
        return true;
      },

      settings: function () {
        return true;
      },

      destroy: function () {
        var $container = $('div.card-widgets__widget-' + self.get_widget_code());
        $container.find('.widget-body__acolhimento').remove();
      }
    };

    return this;
  };

  return CustomWidget;
});
