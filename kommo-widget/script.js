define(['jquery'], function ($) {
  var CustomWidget = function () {
    var self = this;
    var fabInjected = false;

    function getBaseUrl() {
      var settings = self.params || {};
      return (settings.base_url || 'https://acolhimento-fase1.onrender.com').replace(/\/+$/, '');
    }

    function getCurrentUser() {
      var user = { id: '', name: '' };
      try {
        var u = AMOCRM.constant('user') || {};
        user.id = String(u.id || '');
        user.name = u.name || u.login || '';
      } catch (e) {}
      return user;
    }

    function getContactData() {
      var data = { kommoContactId: '', nome: '', telefone: '' };

      try {
        var match = window.location.pathname.match(/\/(leads|contacts)\/detail\/(\d+)/);
        if (match) {
          data.kommoContactId = match[2];
        }
      } catch (e) {}

      try {
        var card = AMOCRM.data.current_card;
        if (card) {
          if (!data.kommoContactId && card.id) {
            data.kommoContactId = String(card.id);
          }

          if (card.main_contact) {
            data.nome = card.main_contact.name || '';
            var cf = card.main_contact.custom_fields || [];
            for (var i = 0; i < cf.length; i++) {
              if (cf[i].code === 'PHONE') {
                var v = cf[i].values || cf[i].enums || [];
                if (v.length > 0) data.telefone = v[0].value || '';
                break;
              }
            }
          }

          if (!data.nome && card.name) data.nome = card.name;

          if (!data.telefone) {
            var cf2 = card.custom_fields || [];
            for (var j = 0; j < cf2.length; j++) {
              if (cf2[j].code === 'PHONE') {
                var v2 = cf2[j].values || [];
                if (v2.length > 0) data.telefone = v2[0].value || '';
                break;
              }
            }
          }
        }
      } catch (e) {}

      if (!data.nome) {
        try {
          var $title = $('h1.lead-name, .card-entity-name, [class*="entity-name"], .js-entity-name');
          if ($title.length > 0) data.nome = $title.first().text().trim();
        } catch (e) {}
      }

      return data;
    }

    function buildUrl(base, cd) {
      var user = getCurrentUser();
      var url = base + '/widget.html';
      var params = [];
      if (cd.kommoContactId) params.push('kommoContactId=' + encodeURIComponent(cd.kommoContactId));
      if (cd.nome) params.push('nome=' + encodeURIComponent(cd.nome));
      if (cd.telefone) params.push('telefone=' + encodeURIComponent(cd.telefone));
      if (user.name) params.push('agente=' + encodeURIComponent(user.name));
      if (user.id) params.push('agenteId=' + encodeURIComponent(user.id));
      if (params.length > 0) url += '?' + params.join('&');
      return url;
    }

    function injectFab() {
      if (fabInjected || $('#acolhimento-fab').length > 0) {
        fabInjected = true;
        return;
      }

      var base = getBaseUrl();

      var css =
        '#acolhimento-fab{position:fixed;bottom:20px;right:20px;width:52px;height:52px;border-radius:50%;' +
        'background:#2aa777;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.3);' +
        'display:flex;align-items:center;justify-content:center;z-index:99999;transition:transform .2s,background .2s;}' +
        '#acolhimento-fab:hover{transform:scale(1.1);background:#228855;}' +
        '#acolhimento-fab svg{width:24px;height:24px;fill:#fff;}' +
        '#acolhimento-panel{position:fixed;bottom:82px;right:20px;width:300px;height:420px;' +
        'background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.22);overflow:hidden;' +
        'z-index:99998;transform:scale(0.9) translateY(10px);opacity:0;pointer-events:none;' +
        'transition:transform .25s ease,opacity .25s ease;}' +
        '#acolhimento-panel.acolh-open{transform:scale(1) translateY(0);opacity:1;pointer-events:auto;}' +
        '#acolhimento-panel-header{background:#0f172a;color:#fff;padding:10px 14px;display:flex;' +
        'align-items:center;justify-content:space-between;font-family:system-ui,sans-serif;font-size:13px;font-weight:700;}' +
        '#acolhimento-panel-close{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px;line-height:1;padding:2px;}' +
        '#acolhimento-panel-close:hover{color:#fff;}' +
        '#acolhimento-panel iframe{width:100%;height:calc(100% - 40px);border:none;}';

      $('<style>').text(css).appendTo('head');

      var fab = $(
        '<button id="acolhimento-fab" title="Acolhimento">' +
          '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 ' +
          '17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9' +
          '-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 ' +
          '2.08-.8 3.97-2.1 5.39z"/></svg>' +
        '</button>'
      );

      var panel = $(
        '<div id="acolhimento-panel">' +
          '<div id="acolhimento-panel-header">' +
            '<span>Acolhimento</span>' +
            '<button id="acolhimento-panel-close">&times;</button>' +
          '</div>' +
          '<iframe id="acolhimento-iframe" src="about:blank"></iframe>' +
        '</div>'
      );

      $('body').append(fab).append(panel);

      fab.on('click', function () {
        var $p = $('#acolhimento-panel');
        var isOpen = $p.hasClass('acolh-open');

        if (!isOpen) {
          var cd = getContactData();
          var url = buildUrl(base, cd);
          $('#acolhimento-iframe').attr('src', url);
        }

        $p.toggleClass('acolh-open');
      });

      $(document).on('click', '#acolhimento-panel-close', function () {
        $('#acolhimento-panel').removeClass('acolh-open');
      });

      fabInjected = true;
    }

    this.callbacks = {
      render: function () {
        return true;
      },

      init: function () {
        injectFab();
        return true;
      },

      bind_actions: function () {
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
