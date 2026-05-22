#!/usr/bin/env python3
"""
fetch-texts.py
Downloads public-domain texts from Project Gutenberg and writes them as
TypeScript data files for polyglot-reader.

Usage:
    python3 scripts/fetch-texts.py

Requires only the Python standard library.
"""

import urllib.request
import re
import os
import sys
import time

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "data", "texts")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fetch(url: str, encoding="utf-8") -> str | None:
    print(f"  GET {url}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "polyglot-reader-fetch/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
            return raw.decode(encoding, errors="replace")
    except Exception as e:
        print(f"  FAIL: {e}")
        return None


def fetch_gutenberg(book_id: int) -> str | None:
    """Try several URL patterns for a given Gutenberg book ID."""
    patterns = [
        f"https://www.gutenberg.org/cache/epub/{book_id}/pg{book_id}.txt",
        f"https://www.gutenberg.org/files/{book_id}/{book_id}-0.txt",
        f"https://www.gutenberg.org/files/{book_id}/{book_id}-8.txt",
        f"https://www.gutenberg.org/files/{book_id}/{book_id}.txt",
    ]
    for url in patterns:
        text = fetch(url)
        if text and len(text) > 5000:
            return text
        time.sleep(0.3)
    return None


def strip_gutenberg_header_footer(text: str) -> str:
    """Remove the PG license header and footer."""
    start_markers = [
        "*** START OF THE PROJECT GUTENBERG",
        "***START OF THE PROJECT GUTENBERG",
        "*** START OF THIS PROJECT GUTENBERG",
    ]
    end_markers = [
        "*** END OF THE PROJECT GUTENBERG",
        "***END OF THE PROJECT GUTENBERG",
        "*** END OF THIS PROJECT GUTENBERG",
        "End of the Project Gutenberg",
        "End of Project Gutenberg",
    ]
    for m in start_markers:
        idx = text.find(m)
        if idx != -1:
            text = text[idx:]
            newline = text.find("\n")
            text = text[newline:].lstrip()
            break
    for m in end_markers:
        idx = text.find(m)
        if idx != -1:
            text = text[:idx].rstrip()
            break
    return text


def clean(text: str) -> str:
    """Normalise whitespace."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse runs of 3+ blank lines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def ts_string(text: str) -> str:
    """Wrap text in a TypeScript template literal, escaping as needed."""
    escaped = text.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    return f"`{escaped}`"


MAX_STORY_CHARS = 12_000   # ~2 000 words — enough for a full short story
MAX_CHAPTER_CHARS = 8_000  # per chapter


def extract_between(text: str, start_pat: str, end_pat: str,
                    flags=re.IGNORECASE, max_chars: int = MAX_STORY_CHARS) -> str | None:
    """Extract text between two regex patterns, capped at max_chars."""
    m_start = re.search(start_pat, text, flags)
    if not m_start:
        return None
    chunk = text[m_start.start(): m_start.start() + max_chars * 6]  # pre-limit search window
    m_end = re.search(end_pat, chunk, flags)
    if m_end:
        chunk = chunk[:m_end.start()]
    return clean(chunk[:max_chars])


def find_chapters(text: str, chapter_pat: str,
                  flags=re.IGNORECASE, max_chapters: int = 6) -> list[tuple[str, str]]:
    """
    Split text into (heading, body) pairs using a regex that matches chapter headings.
    Caps each body at MAX_CHAPTER_CHARS and total chapters at max_chapters.
    Skips headings with short bodies (e.g. table-of-contents entries).
    """
    matches = list(re.finditer(chapter_pat, text, flags))
    if not matches:
        return []
    chapters = []
    for i, m in enumerate(matches):  # iterate ALL matches, not just first N
        title = m.group(0).strip()
        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = clean(text[body_start:body_end][:MAX_CHAPTER_CHARS])
        if len(body) > 300:  # skip TOC entries (short bodies)
            chapters.append((title, body))
        if len(chapters) >= max_chapters:
            break
    return chapters


def write_file(path: str, content: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Wrote {path}")


# ---------------------------------------------------------------------------
# TypeScript builders
# ---------------------------------------------------------------------------

def book_single(id_, title, author, category, blurb, text, source_url=None, source_label=None) -> str:
    src = f'\n    sourceUrl: "{source_url}",' if source_url else ""
    lbl = f'\n    sourceLabel: "{source_label}",' if source_label else ""
    return f"""  {{
    id: "{id_}",
    title: "{title}",
    author: "{author}",
    category: "{category}",
    blurb: "{blurb}",{src}{lbl}
    text: {ts_string(text)},
  }}"""


def book_chapters(id_, title, author, category, blurb, chapters: list[tuple[str, str]],
                  source_url=None, source_label=None) -> str:
    src = f'\n    sourceUrl: "{source_url}",' if source_url else ""
    lbl = f'\n    sourceLabel: "{source_label}",' if source_label else ""
    ch_lines = []
    for ch_title, ch_text in chapters:
        t = ch_title.replace('"', '\\"')
        ch_lines.append(f'    {{ title: "{t}", text: {ts_string(ch_text)} }}')
    ch_block = ",\n".join(ch_lines)
    return f"""  {{
    id: "{id_}",
    title: "{title}",
    author: "{author}",
    category: "{category}",
    blurb: "{blurb}",{src}{lbl}
    chapters: [
{ch_block}
    ],
  }}"""


# ---------------------------------------------------------------------------
# Per-book fetch + extract logic
# ---------------------------------------------------------------------------

def get_quijote():
    print("quijote...")
    raw = fetch_gutenberg(2000)
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(raw)
    raw = clean(raw)
    chapters = find_chapters(raw, r"CAP[IÍ]TULO\s+[IVXLCDM]+[^\n]*")
    if not chapters:
        chapters = find_chapters(raw, r"Cap[ií]tulo\s+[IVXLCDM]+[^\n]*")
    return chapters[:6] if chapters else None


def get_lazarillo():
    print("lazarillo...")
    # PG 320 is the correct ID
    for gid in [320, 18559]:
        raw = fetch_gutenberg(gid)
        if raw:
            break
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chapters = find_chapters(raw, r"TRATADO\s+[IVXLCDM]+[^\n]*")
    return chapters if chapters else None


def get_tortuga():
    print("tortuga gigante...")
    # PG 13507: Cuentos de Amor de Locura y de Muerte by Quiroga (in Spanish)
    for gid in [13507, 46051]:
        raw = fetch_gutenberg(gid)
        if raw and ("tortuga" in raw.lower() or "selva" in raw.lower()):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"La tortuga|EL ALAMBRE DE P[Ú|U]A|A LA DERIVA",
                            r"(\n[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s]{5,}\n)", re.IGNORECASE | re.MULTILINE)
    if not chunk or len(chunk) < 300:
        # Take the first long story in the collection
        chunk = clean(raw[:MAX_STORY_CHARS])
    return chunk


def get_cordera():
    print("cordera...")
    # Try broader Clarín search
    for gid in [24468, 61573, 55437, 32474]:
        raw = fetch_gutenberg(gid)
        if raw and ("Cordera" in raw or "Clarin" in raw or "Clarín" in raw):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"[¡!]?Adi[oó]s[,\s]+Cordera",
                            r"(\n\s*\*{3}|\nFIN|\n[A-ZÁÉÍÓÚ]{4,})")
    return chunk


def get_alicia_es():
    print("alicia es...")
    # Spanish Alice - PG 11 is English; look for Spanish translation
    for gid in [28507, 55532]:
        raw = fetch_gutenberg(gid)
        if raw and ("Alicia" in raw or "maravillas" in raw.lower()):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chapters = find_chapters(raw, r"CAP[IÍ]TULO\s+[IVXLCDM]+[^\n]*|Cap[ií]tulo\s+[IVXLCDM\d]+[^\n]*")
    return chapters[:4] if chapters else None


def get_caperucita():
    print("caperucita...")
    # Grimm in Spanish - try PG collections
    for gid in [22861, 55693, 19718]:
        raw = fetch_gutenberg(gid)
        if raw and ("caperucita" in raw.lower() or "caperuzita" in raw.lower()):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"caperucit", r"(\n\s*\*{3,}|\n[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ\s]{5,}\n)", re.IGNORECASE)
    return chunk


def get_werther():
    print("werther...")
    raw = fetch_gutenberg(2407)
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    # Letters are dated entries
    chapters = find_chapters(raw, r"\n(Am \d+\. \w+|den \d+\. \w+)[^\n]*\n")
    if not chapters:
        # fallback: split on "Buch" or numbered sections
        chapters = find_chapters(raw, r"\bERSTES BUCH\b|\bZWEITES BUCH\b", re.IGNORECASE)
    return chapters[:10] if chapters else None


def get_verwandlung():
    print("verwandlung...")
    for gid in [22367, 5200]:
        raw = fetch_gutenberg(gid)
        if raw and ("Samsa" in raw or "Ungeziefer" in raw):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    # Kafka divided it into 3 sections marked with Roman numerals on their own line
    chapters = find_chapters(raw, r"^\s*I{1,3}\.?\s*$", re.MULTILINE)
    if not chapters or len(chapters) < 2:
        # Try splitting on double-line breaks into large chunks
        parts = re.split(r"\n{3,}", raw)
        parts = [clean(p) for p in parts if len(p.strip()) > 500]
        if len(parts) >= 2:
            chapters = [(f"Teil {i+1}", p[:MAX_CHAPTER_CHARS]) for i, p in enumerate(parts[:3])]
    return chapters if chapters else None


def get_rotkaeppchen():
    print("rotkaeppchen...")
    raw = fetch_gutenberg(5314)  # Grimm Kinder- und Hausmärchen
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"Rotkäppchen|Rothkäppchen", r"(\n\s*\*{3,}|\n\d+\.\s|\nDer Frosch|\nDornröschen)")
    return chunk


def get_froschkoenig():
    print("froschkoenig...")
    raw = fetch_gutenberg(5314)
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"Der Froschkönig|Froschk[oö]nig", r"(\n\s*\*{3,}|\nKatze und Maus|\nDer gute Handel)")
    return chunk


def get_hamlet_de():
    print("hamlet-de...")
    # PG 7276: Hamlet, Prinz von Dännemark (Schlegel translation)
    for gid in [7276, 2267]:
        raw = fetch_gutenberg(gid)
        if raw and "Hamlet" in raw:
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    # Find "Sein oder Nichtsein" monologue
    chunk = extract_between(raw, r"Sein oder Nichtsein",
                            r"(\nERSTER AKT|\nZWEITER AKT|\nDRITTER AKT|\nVIERTER AKT|\nFUNFTER|\nABGANG)",
                            max_chars=MAX_STORY_CHARS)
    if not chunk or len(chunk) < 200:
        # Fall back to first MAX_STORY_CHARS of cleaned text
        chunk = clean(raw[:MAX_STORY_CHARS])
    return chunk


def get_rabe_de():
    print("poe-de (Der Rabe)...")
    # PG 50887: Ligeia und andere Novellen; Sieben Gedichte (Poe in German)
    for gid in [50887, 16058, 2147]:
        raw = fetch_gutenberg(gid)
        if raw and ("Rabe" in raw or "Gedicht" in raw):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"Der Rabe",
                            r"(\n\s*\*{3,}|\nDer Untergang|\nBerenice|\nLigeia|\nMorella)")
    if not chunk or len(chunk) < 200:
        chunk = clean(raw[:MAX_STORY_CHARS])
    return chunk


def get_candide():
    print("candide...")
    raw = fetch_gutenberg(4650)
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chapters = find_chapters(raw, r"CHAPITRE\s+[IVXLCDM]+[^\n]*|Chapitre\s+[IVXLCDM\d]+[^\n]*")
    return chapters[:6] if chapters else None


def get_bovary():
    print("bovary...")
    raw = fetch_gutenberg(14155)
    if not raw:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    # Bovary is divided into PREMIÈRE PARTIE / DEUXIÈME PARTIE / TROISIÈME PARTIE
    chapters = find_chapters(raw, r"PREMIÈRE PARTIE|DEUXIÈME PARTIE|TROISIÈME PARTIE", re.IGNORECASE)
    return chapters[:3] if chapters else None


def get_parure():
    print("parure...")
    # PG 14790: Contes du jour et de la nuit (contains La Parure)
    for gid in [14790, 3090]:
        raw = fetch_gutenberg(gid)
        if raw and "PARURE" in raw.upper():
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    # The file has: "LA PARURE\n\n[Illustration]\n\nLA PARURE\n\nC'était..."
    # Skip the first (TOC/title+illustration) occurrence and find the story body
    m = re.search(r"LA PARURE\s*\n", raw, re.IGNORECASE)
    if not m:
        return None
    # Advance past illustration/title block to the story text proper
    after = raw[m.end():]
    m2 = re.search(r"C['']?[ée]tait|Il y avait|Une\s", after, re.IGNORECASE)
    if m2:
        story_start = m.end() + m2.start()
    else:
        story_start = m.end()
    # Find end: next all-caps story title
    chunk = raw[story_start: story_start + MAX_STORY_CHARS * 6]
    m_end = re.search(r"\n[A-ZÀÂÉÈÊË][A-ZÀÂÉÈÊË\s]{5,}\n", chunk)
    if m_end:
        chunk = chunk[:m_end.start()]
    return clean(chunk[:MAX_STORY_CHARS])


def get_horla():
    print("horla...")
    # PG 10775: Le Horla standalone
    for gid in [10775, 3090]:
        raw = fetch_gutenberg(gid)
        if raw and "Horla" in raw:
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    return clean(raw[:MAX_STORY_CHARS])


def get_chat_noir():
    print("poe-fr (le chat noir)...")
    # PG 20761: Histoires extraordinaires by Poe, translated by Baudelaire (includes Le Chat Noir)
    for gid in [20761, 20790, 51423, 2148]:
        raw = fetch_gutenberg(gid)
        if raw and ("chat noir" in raw.lower()):
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    chunk = extract_between(raw, r"LE CHAT NOIR|Le Chat [Nn]oir",
                            r"(LE CHIEN|LE LOUP|LA FICELLE|LE HORLA|BÉRÉNICE|LE PUITS)", re.IGNORECASE)
    if not chunk or len(chunk) < 300:
        chunk = clean(raw[:MAX_STORY_CHARS])
    return chunk


def get_hamlet_fr():
    print("hamlet-fr...")
    # Try several French Hamlet editions
    for gid in [17489, 2269, 27761]:
        raw = fetch_gutenberg(gid)
        if raw and "Hamlet" in raw:
            break
    else:
        return None
    raw = strip_gutenberg_header_footer(clean(raw))
    # Take Act III scene 1 (the monologue) — search for "tre ou ne pas"
    chunk = extract_between(raw, r"[ÊEê]tre[,]? ou ne pas [êeÊ]tre",
                            r"(ACTE [IVX]|SCÈNE [IVX]|\nFIN\b)", re.IGNORECASE)
    if not chunk or len(chunk) < 200:
        # fallback: first 12000 chars of cleaned text
        chunk = clean(raw[:MAX_STORY_CHARS])
    return chunk


# ---------------------------------------------------------------------------
# Fallback: use the existing short excerpt from the current file
# ---------------------------------------------------------------------------

EXISTING_EXCERPTS = {
    # Spanish
    "quijote":    ("chapters", [("Capítulo I", "En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor. Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lentejas los viernes, algún palomino de añadidura los domingos, consumían las tres partes de su hacienda.")]),
    "lazarillo":  ("text",     "Pues sepa vuestra merced ante todas cosas que a mí llaman Lázaro de Tormes, hijo de Tomé González y de Antona Pérez, naturales de Tejares, aldea de Salamanca."),
    "tortuga":    ("text",     "Había una vez un hombre que vivía en Buenos Aires, y estaba muy contento porque era un hombre sano y trabajador."),
    "cordera":    ("text",     "Eran tres: ¡siempre los tres! Rosa, Pinín y la Cordera."),
    "alicia":     ("chapters", [("Capítulo I", "Alicia empezaba a estar harta de estar sentada junto a su hermana en la orilla del río, sin tener nada que hacer.")]),
    "caperucita": ("text",     "Había una vez una dulce muchachita a quien todo el mundo amaba con solo verla."),
    # German
    "werther":      ("chapters", [("Brief I", "Wie froh bin ich, dass ich weg bin! Bester Freund, was ist das Herz des Menschen!")]),
    "verwandlung":  ("chapters", [("Teil I", "Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt.")]),
    "rotkaeppchen": ("text",     "Es war einmal eine kleine süße Dirne, die hatte jedermann lieb, der sie nur ansah."),
    "froschkoenig": ("text",     "In den alten Zeiten, wo das Wünschen noch geholfen hat, lebte ein König, dessen Töchter waren alle schön."),
    "hamlet-de":    ("text",     "Sein oder Nichtsein, das ist hier die Frage: Obs edler im Gemüt, die Pfeil und Schleudern des wütenden Geschicks erdulden."),
    "poe-de":       ("text",     "Einst, in dunkler Mitternachtsstunde, als ich müd und matt erwog manchen seltsam-alten Bandes lang vergessner Lehren Spruch."),
    # French
    "candide":   ("chapters", [("Chapitre I", "Il y avait en Westphalie, dans le château de monsieur le baron de Thunder-ten-tronckh, un jeune garçon à qui la nature avait donné les mœurs les plus douces.")]),
    "bovary":    ("chapters", [("Chapitre I", "Nous étions à l'étude, quand le proviseur entra, suivi d'un nouveau habillé en bourgeois.")]),
    "parure":    ("text",     "C'était une de ces jolies et charmantes filles, nées, comme par une erreur du destin, dans une famille d'employés."),
    "horla":     ("text",     "8 mai. Quelle journée admirable ! J'ai passé toute la matinée étendu sur l'herbe, devant ma maison."),
    "poe-fr":    ("text",     "Relativement à la très-étrange et pourtant très-familière histoire que je vais coucher par écrit, je n'attends ni ne sollicite la créance."),
    "hamlet-fr": ("text",     "Être, ou ne pas être, telle est la question."),
}


def coerce(result, book_id: str) -> tuple[str, object]:
    """
    Given a fetch result (None / str / list-of-tuples), return (mode, data)
    where mode is 'text' or 'chapters'.
    Falls back to EXISTING_EXCERPTS if result is falsy or too short.
    """
    fallback_mode, fallback_data = EXISTING_EXCERPTS.get(book_id, ("text", "(text unavailable)"))

    if not result:
        print(f"  !! using fallback for {book_id}")
        return fallback_mode, fallback_data

    if isinstance(result, str):
        if len(result) < 200:
            print(f"  !! text too short for {book_id}, using fallback")
            return fallback_mode, fallback_data
        return "text", result

    if isinstance(result, list):
        valid = [(t, b) for t, b in result if len(b) > 200]
        if not valid:
            print(f"  !! no valid chapters for {book_id}, using fallback")
            return fallback_mode, fallback_data
        return "chapters", valid

    return fallback_mode, fallback_data


# ---------------------------------------------------------------------------
# Build each language file
# ---------------------------------------------------------------------------

def build_es():
    print("\n=== Spanish ===")
    books = []

    mode, data = coerce(get_quijote(), "quijote")
    if mode == "chapters":
        books.append(book_chapters("quijote", "Don Quijote de la Mancha", "Miguel de Cervantes",
            "originals", "El comienzo de la obra cumbre del Siglo de Oro.",
            data, "https://es.wikisource.org/wiki/El_ingenioso_hidalgo_don_Quijote_de_la_Mancha", "Wikisource"))
    else:
        books.append(book_single("quijote", "Don Quijote de la Mancha", "Miguel de Cervantes",
            "originals", "El comienzo de la obra cumbre del Siglo de Oro.",
            data, "https://es.wikisource.org/wiki/El_ingenioso_hidalgo_don_Quijote_de_la_Mancha", "Wikisource"))

    mode, data = coerce(get_lazarillo(), "lazarillo")
    if mode == "chapters":
        books.append(book_chapters("lazarillo", "Lazarillo de Tormes", "Anónimo",
            "originals", "Primera novela picaresca, anónima del siglo XVI.",
            data, "https://es.wikisource.org/wiki/Lazarillo_de_Tormes", "Wikisource"))
    else:
        books.append(book_single("lazarillo", "Lazarillo de Tormes", "Anónimo",
            "originals", "Primera novela picaresca, anónima del siglo XVI.",
            data, "https://es.wikisource.org/wiki/Lazarillo_de_Tormes", "Wikisource"))

    _, data = coerce(get_tortuga(), "tortuga")
    books.append(book_single("tortuga", "La tortuga gigante", "Horacio Quiroga",
        "short-stories", "Cuento de la selva, ternura y aventura.",
        data, "https://es.wikisource.org/wiki/La_tortuga_gigante", "Wikisource"))

    _, data = coerce(get_cordera(), "cordera")
    books.append(book_single("cordera", "Adiós, Cordera", "Leopoldo Alas (Clarín)",
        "short-stories", "Relato breve sobre la infancia y la pérdida.",
        data, "https://es.wikisource.org/wiki/%C2%A1Adi%C3%B3s,_Cordera!", "Wikisource"))

    mode, data = coerce(get_alicia_es(), "alicia")
    if mode == "chapters":
        books.append(book_chapters("alicia", "Alicia en el País de las Maravillas", "Lewis Carroll",
            "translated-classics", "Traducción al español del clásico de Carroll.",
            data, "https://es.wikisource.org/wiki/Alicia_en_el_Pa%C3%ADs_de_las_Maravillas", "Wikisource"))
    else:
        books.append(book_single("alicia", "Alicia en el País de las Maravillas", "Lewis Carroll",
            "translated-classics", "Traducción al español del clásico de Carroll.",
            data, "https://es.wikisource.org/wiki/Alicia_en_el_Pa%C3%ADs_de_las_Maravillas", "Wikisource"))

    _, data = coerce(get_caperucita(), "caperucita")
    books.append(book_single("caperucita", "Caperucita Roja", "Hermanos Grimm (trad.)",
        "translated-classics", "Cuento clásico de los hermanos Grimm.",
        data, "https://es.wikisource.org/wiki/Caperucita_Roja", "Wikisource"))

    return 'import type { Book } from "@/lib/types";\n\nexport const es: Book[] = [\n' + \
           ",\n".join(books) + "\n];\n"


def build_de():
    print("\n=== German ===")
    books = []

    mode, data = coerce(get_werther(), "werther")
    if mode == "chapters":
        books.append(book_chapters("werther", "Die Leiden des jungen Werthers", "Johann Wolfgang von Goethe",
            "originals", "Brieferoman, ein Klassiker des Sturm und Drang.",
            data, "https://de.wikisource.org/wiki/Die_Leiden_des_jungen_Werthers", "Wikisource"))
    else:
        books.append(book_single("werther", "Die Leiden des jungen Werthers", "Johann Wolfgang von Goethe",
            "originals", "Brieferoman, ein Klassiker des Sturm und Drang.",
            data, "https://de.wikisource.org/wiki/Die_Leiden_des_jungen_Werthers", "Wikisource"))

    mode, data = coerce(get_verwandlung(), "verwandlung")
    if mode == "chapters":
        books.append(book_chapters("verwandlung", "Die Verwandlung", "Franz Kafka",
            "originals", "Berühmte Erzählung über Gregor Samsa.",
            data, "https://de.wikisource.org/wiki/Die_Verwandlung", "Wikisource"))
    else:
        books.append(book_single("verwandlung", "Die Verwandlung", "Franz Kafka",
            "originals", "Berühmte Erzählung über Gregor Samsa.",
            data, "https://de.wikisource.org/wiki/Die_Verwandlung", "Wikisource"))

    _, data = coerce(get_rotkaeppchen(), "rotkaeppchen")
    books.append(book_single("rotkaeppchen", "Rotkäppchen", "Brüder Grimm",
        "short-stories", "Eines der bekanntesten Grimm-Märchen.",
        data, "https://de.wikisource.org/wiki/Rothk%C3%A4ppchen_(1857)", "Wikisource"))

    _, data = coerce(get_froschkoenig(), "froschkoenig")
    books.append(book_single("froschkoenig", "Der Froschkönig", "Brüder Grimm",
        "short-stories", "Klassisches Märchen vom verzauberten Prinzen.",
        data, "https://de.wikisource.org/wiki/Der_Froschk%C3%B6nig_oder_der_eiserne_Heinrich_(1857)", "Wikisource"))

    _, data = coerce(get_hamlet_de(), "hamlet-de")
    books.append(book_single("hamlet-de", "Hamlet (Auszug)", "William Shakespeare, Übers. Schlegel",
        "translated-classics", "Die berühmte Schlegel-Übersetzung.",
        data, "https://de.wikisource.org/wiki/Hamlet,_Prinz_von_D%C3%A4nemark", "Wikisource"))

    _, data = coerce(get_rabe_de(), "poe-de")
    books.append(book_single("poe-de", "Der Rabe", "Edgar Allan Poe (Übers.)",
        "translated-classics", "Poes Gedicht in deutscher Übersetzung.",
        data, "https://de.wikisource.org/wiki/Der_Rabe_(Poe)", "Wikisource"))

    return 'import type { Book } from "@/lib/types";\n\nexport const de: Book[] = [\n' + \
           ",\n".join(books) + "\n];\n"


def build_fr():
    print("\n=== French ===")
    books = []

    mode, data = coerce(get_candide(), "candide")
    if mode == "chapters":
        books.append(book_chapters("candide", "Candide", "Voltaire",
            "originals", "Conte philosophique du siècle des Lumières.",
            data, "https://fr.wikisource.org/wiki/Candide,_ou_l%E2%80%99Optimisme", "Wikisource"))
    else:
        books.append(book_single("candide", "Candide", "Voltaire",
            "originals", "Conte philosophique du siècle des Lumières.",
            data, "https://fr.wikisource.org/wiki/Candide,_ou_l%E2%80%99Optimisme", "Wikisource"))

    mode, data = coerce(get_bovary(), "bovary")
    if mode == "chapters":
        books.append(book_chapters("bovary", "Madame Bovary", "Gustave Flaubert",
            "originals", "Le roman réaliste par excellence.",
            data, "https://fr.wikisource.org/wiki/Madame_Bovary", "Wikisource"))
    else:
        books.append(book_single("bovary", "Madame Bovary", "Gustave Flaubert",
            "originals", "Le roman réaliste par excellence.",
            data, "https://fr.wikisource.org/wiki/Madame_Bovary", "Wikisource"))

    _, data = coerce(get_parure(), "parure")
    books.append(book_single("parure", "La Parure", "Guy de Maupassant",
        "short-stories", "Nouvelle célèbre sur l'apparence et le destin.",
        data, "https://fr.wikisource.org/wiki/La_Parure", "Wikisource"))

    _, data = coerce(get_horla(), "horla")
    books.append(book_single("horla", "Le Horla", "Guy de Maupassant",
        "short-stories", "Nouvelle fantastique et inquiétante.",
        data, "https://fr.wikisource.org/wiki/Le_Horla_(recueil)", "Wikisource"))

    _, data = coerce(get_chat_noir(), "poe-fr")
    books.append(book_single("poe-fr", "Le Chat noir", "Edgar Allan Poe, trad. Baudelaire",
        "translated-classics", "La célèbre traduction de Baudelaire.",
        data, "https://fr.wikisource.org/wiki/Le_Chat_noir_(Poe)", "Wikisource"))

    _, data = coerce(get_hamlet_fr(), "hamlet-fr")
    books.append(book_single("hamlet-fr", "Hamlet (extrait)", "William Shakespeare, trad. F.-V. Hugo",
        "translated-classics", "Le célèbre monologue, traduit par François-Victor Hugo.",
        data, "https://fr.wikisource.org/wiki/Hamlet,_prince_de_Danemark", "Wikisource"))

    return 'import type { Book } from "@/lib/types";\n\nexport const fr: Book[] = [\n' + \
           ",\n".join(books) + "\n];\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    es_content = build_es()
    write_file(os.path.join(OUT_DIR, "es.ts"), es_content)

    de_content = build_de()
    write_file(os.path.join(OUT_DIR, "de.ts"), de_content)

    fr_content = build_fr()
    write_file(os.path.join(OUT_DIR, "fr.ts"), fr_content)

    print("\nDone! Run: npx tsc --noEmit  to verify TypeScript.")
