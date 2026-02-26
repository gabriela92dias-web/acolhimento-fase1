define(['jquery'], function ($) {
  var CustomWidget = function () {
    var self = this;

    function getBaseUrl() {
      try {
        var settings = self.params || {};
        return (settings.base_url || 'https://acolhimento-fase1.onrender.com').replace(/\/+$/, '');
      } catch (e) {
        return 'https://acolhimento-fase1.onrender.com';
      }
    }

    function getCurrentUser() {
      try {
        var u = AMOCRM.constant('user') || {};
        return { id: String(u.id || ''), name: u.name || u.login || '' };
      } catch (e) {
        return { id: '', name: '' };
      }
    }

    function getContactId() {
      try {
        var match = window.location.pathname.match(/\/(leads|contacts)\/detail\/(\d+)/);
        if (match) return match[2];
      } catch (e) {}
      try {
        if (AMOCRM.data.current_card && AMOCRM.data.current_card.id) {
          return String(AMOCRM.data.current_card.id);
        }
      } catch (e) {}
      return '';
    }

    function getContactName() {
      try {
        var card = AMOCRM.data.current_card;
        if (card) {
          if (card.main_contact && card.main_contact.name) return card.main_contact.name;
          if (card.name) return card.name;
        }
      } catch (e) {}
      return '';
    }

    function buildUrl() {
      var base = getBaseUrl();
      var user = getCurrentUser();
      var contactId = getContactId();
      var nome = getContactName();

      var p = [];
      if (contactId) p.push('kommoContactId=' + encodeURIComponent(contactId));
      if (nome) p.push('nome=' + encodeURIComponent(nome));
      if (user.name) p.push('agente=' + encodeURIComponent(user.name));
      if (user.id) p.push('agenteId=' + encodeURIComponent(user.id));

      return base + '/widget.html' + (p.length > 0 ? '?' + p.join('&') : '');
    }

    function renderIframe() {
      try {
        var url = buildUrl();
        var iframe = '<iframe src="' + url + '" style="width:100%;height:360px;border:none;border-radius:4px;background:#f8f9fa;" allow="clipboard-write"></iframe>';

        var $containers = $('.card-widgets__widget-body');
        $containers.each(function () {
          var $this = $(this);
          if ($this.find('iframe[src*="acolhimento"]').length === 0 && $this.closest('[class*="acolhimento"], [class*="Acolhimento"]').length > 0) {
            $this.html(iframe);
          }
        });

        if ($('.card-widgets__widget-body iframe[src*="acolhimento"]').length === 0) {
          var $widgetBodies = $('[class*="widget-body__widget"], [class*="widget_body_"]');
          $widgetBodies.each(function () {
            var $el = $(this);
            if ($el.children().length === 0 || $el.text().trim() === '') {
              $el.html(iframe);
              return false;
            }
          });
        }
      } catch (e) {}
    }

    this.callbacks = {
      render: function () {
        console.log('[Acolhimento] render called, area:', self.system ? self.system().area : 'unknown');
        return true;
      },

      init: function () {
        console.log('[Acolhimento] init called');
        setTimeout(renderIframe, 500);
        setTimeout(renderIframe, 2000);
        return true;
      },

      bind_actions: function () {
        console.log('[Acolhimento] bind_actions called');
        return true;
      },

      settings: function () {
        return true;
      },

      onSave: function () {
        return true;
      },

      destroy: function () {}
    };

    return this;
  };

  return CustomWidget;
});
