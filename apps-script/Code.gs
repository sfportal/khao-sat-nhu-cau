/**
 * Khảo sát nhu cầu AI ↔ Google Drive, Google Sheet, BVI Điều hành
 *
 * Form công khai (GitHub Pages) gửi về đây. Script:
 *   1. Lưu tệp khách tải lên vào một thư mục Drive riêng cho từng khách.
 *   2. Ghi một dòng vào Google Sheet (bảng quản lý nhu cầu).
 *   3. Đẩy nhu cầu vào BVI Điều hành qua POST /v1/leads (trang "Nhu cầu khách hàng").
 *   4. Gửi email báo có khách mới (nếu đặt NOTIFY_EMAIL).
 *
 * Khóa API BVI không bao giờ nằm trong trang web. Đặt trong
 * Project Settings > Script Properties:
 *   BVI_KEY       khóa API BVI có quyền leads_write (bắt buộc để đẩy về BVI Điều hành)
 *   SHEET_ID      ID Google Sheet quản lý (chạy setup() một lần sẽ tự tạo)
 *   FOLDER_ID     ID thư mục Drive chứa tệp khách (chạy setup() một lần sẽ tự tạo)
 *   NOTIFY_EMAIL  email nhận báo khách mới, nhiều email cách nhau dấu phẩy (tùy chọn)
 */

var BVI_LEADS_URL = 'https://pkckduidwfcncipwzdxa.supabase.co/functions/v1/api/v1/leads';
var MAX_FILES = 5;
var MAX_SIZE = 5 * 1024 * 1024;
var HEADERS = ['Thời điểm gửi', 'Họ tên', 'Công ty / HTX', 'SĐT / Zalo', 'Email', 'Chức vụ', 'Tỉnh', 'Ngành', 'Quy mô',
  'Mảng gặp khó', 'Dịch vụ quan tâm', 'Mô tả nhu cầu', 'Ngày tư vấn', 'Khung giờ', 'Thời lượng', 'Hình thức',
  'Nguồn', 'Người giới thiệu', 'Tệp đính kèm', 'Thư mục tệp', 'Mã BVI', 'Trạng thái', 'Người phụ trách', 'Ghi chú'];

function prop(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function s(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 500); }

/** Chạy tay một lần trong trình soạn Apps Script: tạo Sheet và thư mục Drive, lưu ID vào Script Properties. */
function setup() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SHEET_ID')) {
    var ss = SpreadsheetApp.create('Khảo sát nhu cầu AI - Quản lý');
    var sh = ss.getSheets()[0];
    sh.setName('Nhu cầu');
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#13303B').setFontColor('#FFFFFF');
    sh.setColumnWidth(12, 420);
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(['Mới', 'Đã liên hệ', 'Đã hẹn', 'Đã tư vấn', 'Đã cọc', 'Đã ký', 'Không theo'], true).build();
    sh.getRange(2, 22, 2000, 1).setDataValidation(rule);
    p.setProperty('SHEET_ID', ss.getId());
    Logger.log('Sheet: ' + ss.getUrl());
  }
  if (!p.getProperty('FOLDER_ID')) {
    var f = DriveApp.createFolder('Khảo sát nhu cầu AI - Tệp khách gửi');
    p.setProperty('FOLDER_ID', f.getId());
    Logger.log('Thư mục: ' + f.getUrl());
  }
  Logger.log('Xong. SHEET_ID=' + p.getProperty('SHEET_ID') + ' FOLDER_ID=' + p.getProperty('FOLDER_ID'));
}

function doGet() { return out({ ok: true, hint: 'POST only' }); }

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, error: 'bad_json', message: 'Dữ liệu gửi lên không hợp lệ' }); }
  if (b.website) return out({ ok: true }); // bẫy bot: ô ẩn có chữ thì bỏ qua, vẫn báo thành công
  var name = s(b.name, 120), phone = s(b.phone, 40), detail = s(b.detail, 3000);
  if (!name) return out({ ok: false, error: 'missing_name', message: 'Thiếu họ tên' });
  if (phone.replace(/\D/g, '').length < 9) return out({ ok: false, error: 'missing_contact', message: 'Thiếu số điện thoại' });
  if (!detail) return out({ ok: false, error: 'missing_detail', message: 'Thiếu mô tả nhu cầu' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = new Date();
    var extId = 'ksnc-' + Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).slice(2, 7);

    // 1. Tệp
    var saved = [], folderUrl = '';
    var list = Array.isArray(b.files) ? b.files.slice(0, MAX_FILES) : [];
    if (list.length) {
      var root = DriveApp.getFolderById(prop('FOLDER_ID'));
      var sub = root.createFolder(Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HHmm') + ' - ' + (s(b.org, 80) || name));
      folderUrl = sub.getUrl();
      list.forEach(function (f) {
        var bytes = Utilities.base64Decode(String(f.data || ''));
        if (!bytes.length || bytes.length > MAX_SIZE) return;
        var file = sub.createFile(Utilities.newBlob(bytes, s(f.mime, 120) || 'application/octet-stream', s(f.name, 150) || 'tep'));
        saved.push({ name: file.getName(), url: file.getUrl() });
      });
    }

    var pains = (b.pains || []).map(function (x) { return s(x, 60); }).join(', ');
    var needs = (b.needs || []).map(function (x) { return s(x, 60); });
    var dateVN = s(b.date, 10).split('-').reverse().join('/');
    var booking = dateVN + ', ' + s(b.slot, 40) + ', ' + s(b.duration, 20) + ', ' + s(b.mode, 40);

    // 2. Đẩy về BVI Điều hành
    var bviId = '', bviErr = '';
    var key = prop('BVI_KEY');
    if (key) {
      var lines = [
        'LỊCH TƯ VẤN MONG MUỐN: ' + booking,
        b.role ? 'Chức vụ: ' + s(b.role, 80) : '',
        b.industry ? 'Ngành: ' + s(b.industry, 80) + (b.size ? ' · ' + s(b.size, 40) : '') : '',
        pains ? 'Mảng gặp khó: ' + pains : '',
        '',
        detail,
        saved.length ? '\nTệp đính kèm (' + saved.length + '): ' + folderUrl : ''
      ].filter(function (x, i) { return x !== '' || i === 4; });
      var body = {
        name: name, org: s(b.org, 160), phone: phone, email: s(b.email, 160),
        province: s(b.province, 80), needs: needs.length ? needs : ['Tư vấn AI'],
        detail: lines.join('\n').slice(0, 4000),
        source: s(b.source, 80) || 'Website', source_note: 'Form khảo sát nhu cầu AI · Lịch: ' + booking,
        referrer: s(b.referrer, 160), external_id: extId
      };
      try {
        var r = UrlFetchApp.fetch(BVI_LEADS_URL, {
          method: 'post', contentType: 'application/json', payload: JSON.stringify(body),
          headers: { 'X-API-Key': key }, muteHttpExceptions: true
        });
        var j = JSON.parse(r.getContentText() || '{}');
        if (j.ok) bviId = j.id; else bviErr = (j.error || r.getResponseCode()) + '';
      } catch (x) { bviErr = String(x && x.message || x).slice(0, 120); }
    } else {
      bviErr = 'chưa đặt BVI_KEY';
    }

    // 3. Ghi Sheet
    var sh = SpreadsheetApp.openById(prop('SHEET_ID')).getSheets()[0];
    sh.appendRow([
      now, name, s(b.org, 160), "'" + phone, s(b.email, 160), s(b.role, 80), s(b.province, 80), s(b.industry, 80), s(b.size, 40),
      pains, needs.join(', '), detail, dateVN, s(b.slot, 40), s(b.duration, 20), s(b.mode, 40),
      s(b.source, 80), s(b.referrer, 160), saved.map(function (f) { return f.name; }).join('\n'), folderUrl,
      bviId || ('Lỗi: ' + bviErr), 'Mới', '', ''
    ]);

    // 4. Email báo
    var to = prop('NOTIFY_EMAIL');
    if (to) {
      MailApp.sendEmail({
        to: to,
        subject: 'Khách mới đặt lịch tư vấn AI: ' + (s(b.org, 80) || name) + ' · ' + dateVN,
        body: [name + (b.org ? ' · ' + s(b.org, 160) : ''), 'SĐT/Zalo: ' + phone, 'Lịch: ' + booking,
          'Dịch vụ: ' + needs.join(', '), 'Mảng gặp khó: ' + pains, '', detail,
          folderUrl ? '\nTệp: ' + folderUrl : '', '\nBảng quản lý: https://docs.google.com/spreadsheets/d/' + prop('SHEET_ID')].join('\n')
      });
    }
    return out({ ok: true, id: extId });
  } catch (x) {
    return out({ ok: false, error: 'server_error', message: 'Lỗi máy chủ, vui lòng thử lại' });
  } finally {
    lock.releaseLock();
  }
}
