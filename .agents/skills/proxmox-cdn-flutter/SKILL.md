---
name: proxmox-cdn-flutter
description: Complete guide, endpoints, and Flutter Dart code snippets for uploading and serving static media assets using Proxmox VM CDN (202.6.239.245).
---

# Proxmox CDN & Asset Management for Flutter

This skill provides full documentation, API endpoint specifications, and copy-pasteable Flutter (Dart) helper classes for uploading and fetching high-performance static media assets from the Proxmox VM CDN server.

---

## 1. Proxmox CDN Specifications

* **Base URL**: `http://202.6.239.245`
* **CDN Direct Asset Access**: `http://202.6.239.245/cdn/{folder}/{filename}`
* **Upload Endpoint**: `POST http://202.6.239.245/api/cdn/upload`
* **File Management Endpoint**: `GET / DELETE http://202.6.239.245/api/cdn/files`
* **Persistence**: Files are permanently stored on Proxmox VM disk under `./public/cdn/` and linked via Docker host volume mapping. Rebuilding containers will **not** delete uploaded files.
* **CORS**: Enabled (`Access-Control-Allow-Origin: *`) for Flutter Web, iOS, and Android.
* **Caching**: Pre-configured with `Cache-Control: public, max-age=31536000, immutable`.

---

## 2. API Endpoints Reference

### 1. Upload File (`POST /api/cdn/upload`)
* **Content-Type**: `multipart/form-data`
* **Form Data Fields**:
  * `file`: Binary file (image, document, PDF, etc.)
  * `folder`: *(Optional)* Subfolder name e.g. `catalog`, `advisors`, `products`, `signatures`, `general` (default: `general`).

#### Example Response (`201 Created`):
```json
{
  "success": true,
  "message": "File uploaded successfully to Proxmox CDN",
  "data": {
    "url": "http://202.6.239.245/cdn/catalog/product_bag_1773829.jpg",
    "path": "/cdn/catalog/product_bag_1773829.jpg",
    "filename": "product_bag_1773829.jpg",
    "folder": "catalog",
    "size": 154200,
    "type": "image/jpeg"
  }
}
```

---

### 2. Stream / Download File (`GET /cdn/{folder}/{filename}`)
* **Direct Access**: `http://202.6.239.245/cdn/catalog/product_bag_1773829.jpg`
* Directly renders/streams image or file in Flutter `Image.network()` or `CachedNetworkImage`.

---

### 3. List All Files (`GET /api/cdn/files?folder=catalog`)
* **Query Params**: `folder` *(Optional)*.

#### Example Response (`200 OK`):
```json
{
  "success": true,
  "count": 2,
  "files": [
    {
      "filename": "product_bag_1773829.jpg",
      "folder": "catalog",
      "path": "/cdn/catalog/product_bag_1773829.jpg",
      "url": "http://202.6.239.245/cdn/catalog/product_bag_1773829.jpg",
      "size": 154200,
      "updatedAt": "2026-08-05T13:10:00.000Z"
    }
  ]
}
```

---

### 4. Delete File (`DELETE /api/cdn/files?path=/cdn/catalog/filename.jpg`)
* **Query Params**: `path` (Required).

---

## 3. Flutter (Dart) Ready-to-Use Service Code

Copy and paste this Flutter service into your Flutter project at `lib/services/proxmox_cdn_service.dart`:

```dart
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;

class ProxmoxCdnService {
  static const String baseUrl = 'http://202.6.239.245';

  /// Uploads a File to Proxmox CDN
  /// Returns the public CDN URL string if successful
  static Future<String?> uploadFile({
    required File file,
    String folder = 'general',
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/cdn/upload');
      final request = http.MultipartRequest('POST', uri);

      request.fields['folder'] = folder;
      request.files.add(
        await http.MultipartFile.fromPath('file', file.path),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['data']['url'] as String;
        }
      }
      print('Proxmox CDN Upload failed: ${response.body}');
      return null;
    } catch (e) {
      print('Error uploading to Proxmox CDN: $e');
      return null;
    }
  }

  /// Uploads Raw Bytes (For Flutter Web / ImagePicker in-memory bytes)
  static Future<String?> uploadBytes({
    required List<int> bytes,
    required String filename,
    String folder = 'general',
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/cdn/upload');
      final request = http.MultipartRequest('POST', uri);

      request.fields['folder'] = folder;
      request.files.add(
        http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: filename,
        ),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['data']['url'] as String;
        }
      }
      return null;
    } catch (e) {
      print('Error uploading bytes to Proxmox CDN: $e');
      return null;
    }
  }

  /// Deletes a file from Proxmox CDN
  static Future<bool> deleteFile(String cdnPathOrUrl) async {
    try {
      final cleanPath = cdnPathOrUrl.replaceAll(baseUrl, '');
      final uri = Uri.parse('$baseUrl/api/cdn/files?path=${Uri.encodeComponent(cleanPath)}');
      final response = await http.delete(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      print('Error deleting file from Proxmox CDN: $e');
      return false;
    }
  }
}
```

---

## 4. Flutter UI Usage Example

```dart
// Display Image directly from CDN:
Image.network(
  'http://202.6.239.245/cdn/catalog/sample_bag.jpg',
  fit: BoxFit.cover,
  errorBuilder: (context, error, stackTrace) => Icon(Icons.broken_image),
)

// Upload Image File from ImagePicker:
final File selectedFile = File(pickedFile.path);
final String? uploadedUrl = await ProxmoxCdnService.uploadFile(
  file: selectedFile,
  folder: 'catalog',
);

if (uploadedUrl != null) {
  print('Uploaded successfully: $uploadedUrl');
}
```
