# Audiobooks API (FastAPI)

Китобҳои классикӣ (public domain) барои хондан ва гӯш кардан, боб ба боб.

## Оғоз

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python create_admin.py admin admin@example.tj <password>
.venv/bin/uvicorn main:app --reload
```

Swagger: http://127.0.0.1:8000/docs

## Моделҳо

- **User**: корбар, забони интихобшуда, `is_admin`
- **Author** (`death_year` барои санҷиши public domain), **Category**, **Narrator** (AI ё инсон)
- **Book**: `language`, `license_type`, `source_url`, `is_published`, муқова
- **Chapter**: ҳар боб матн ва файли аудиои худро дорад (`audio_status`)
- **ListeningProgress**: корбар аз ҳамон ҷое давом медиҳад, ки қатъ карда буд
- **Bookmark**, **Favorite**, **Review**
- **CopyrightReport**: шикоят аз ҳуқуқ; ҳолати `removed` китобро фавран пинҳон мекунад

Аудио дар `media/audio/` нигоҳ дошта мешавад ва аз `/media/...` бо Range (перемотка) дода мешавад.
