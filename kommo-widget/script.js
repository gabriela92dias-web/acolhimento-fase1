define(['jquery'], function ($) {
  var CustomWidget = function () {
    var self = this;

    function getBaseUrl() {
      var settings = self.params || {};
      return (settings.base_url || 'https://acolhimento-fase1.onrender.com').replace(/\/+$/, '');
    }

    function getContactData() {
      var data = { kommoContactId: '', nome: '', telefone: '' };
      try {
        var card = AMOCRM.data.current_card || {};
        data.kommoContactId = card.id || '';
        var mc = card.main_contact || {};
        data.nome = mc.name || card.name || '';
        var cf = mc.custom_fields || card.custom_fields || [];
        for (var i = 0; i < cf.length; i++) {
          if (cf[i].code === 'PHONE') {
            var v = cf[i].values || cf[i].enums || [];
            if (v.length > 0) { data.telefone = v[0].value || ''; }
            break;
          }
        }
      } catch (e) {}
      return data;
    }

    this.callbacks = {
      render: function () {
        return true;
      },

      init: function () {
        var area = self.system().area;
        if (area !== 'ccard' && area !== 'lcard') return true;

        var cd = getContactData();
        if (!cd.kommoContactId) return true;

        var base = getBaseUrl();
        var url = base + '/widget.html?' +
          'kommoContactId=' + encodeURIComponent(cd.kommoContactId) +
          '&nome=' + encodeURIComponent(cd.nome) +
          '&telefone=' + encodeURIComponent(cd.telefone);

        var wCode = self.get_widget_code();
        var $el = $('div.widget_body_' + wCode);
        if ($el.length === 0) {
          $el = $('#' + wCode + ' .widget-body__widget');
        }
        if ($el.length === 0) {
          $el = $('[class*="' + wCode + '"]').first();
        }

        $el.html(
          '<iframe src="' + url + '" ' +
          'style="width:100%;height:320px;border:none;border-radius:8px;background:#f8f9fa;" ' +
          'allow="clipboard-write"></iframe>'
        );

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
