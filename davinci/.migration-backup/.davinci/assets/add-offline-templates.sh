#!/bin/bash

# Create Offline Distribution Package
# Creates self-contained single-folder exports with navbar + subheader (fully functional)
# but without canvas authoring features (annotations, change history).
# Each prototype is independently shareable — opens directly from file://.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Validate input
if [ -z "$1" ]; then
    printf "${RED}Usage: add-offline-templates.sh <prototype-name>${NC}\n"
    printf "       add-offline-templates.sh all\n"
    echo ""
    echo "Creates a self-contained offline prototype folder."
    echo "Includes navbar + subheader (functional), info ribbon, and footer."
    echo "No annotations, change history, or inter-prototype navigation."
    exit 1
fi

# Function to extract page content from prototype index.html
extract_page_content() {
    local SRC_HTML=$1
    awk '/<script id="page-content"/{found=1; next} found && /<\/script>/{found=0; next} found{print}' "$SRC_HTML"
}

# Function to create standalone header template (simplified ribbon + navbar + subheader, no notes/changelog)
create_standalone_header() {
    local OUT_DIR=$1
    local SRC_HEADER="assets/canvas/parts/header.html"

    # Build standalone header: simplified ribbon + modal + navbar + subheader
    cat > "${OUT_DIR}/.header-template.html" << 'RIBBONEOF'
<header>
    <!-- Prototype Ribbon (offline: info only) -->
    <div class="prototype-ribbon">
        <div class="prototype-ribbon__grid">
            <div class="prototype-ribbon__cell"></div>
            <div class="prototype-ribbon__message">
                <span class="prototype-ribbon__message-text">You are previewing a <strong>Prototype</strong></span>
                <a class="prototype-ribbon__message-icon" id="prototypeInfoBtn" aria-label="Prototype Information">
                    <svg width="16" height="16" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M30.0151129,59.5508318 C46.1872516,59.5508318 59.6140635,46.1546139 59.6140635,29.9824753 C59.6140635,13.8102773 46.1565387,0.414059407 29.9843406,0.414059407 C13.8366773,0.414059407 0.446732674,13.8102773 0.446732674,29.9824753 C0.446732674,46.1546139 13.8673901,59.5508318 30.0151129,59.5508318 Z M30.0151129,54.6394397 C16.3601228,54.6394397 5.4133307,43.6681783 5.4133307,29.9824753 C5.4133307,16.2967129 16.3293505,5.32544555 29.9843406,5.32544555 C43.670103,5.32544555 54.6720833,16.2967129 54.6720833,29.9824753 C54.6720833,43.6681783 43.7008159,54.6394397 30.0151129,54.6394397 Z M29.4417268,35.9961387 C30.8941426,35.9961387 31.7744199,35.0788515 31.7744199,33.9275644 C31.7744199,33.803406 31.7744199,33.6792476 31.7744199,33.5550892 C31.7744199,31.9441189 32.7054298,30.9259604 34.7360436,29.5741189 C37.5313902,27.7410892 39.5578456,26.0385149 39.5578456,22.5560198 C39.5578456,17.7428911 35.2559644,15.1519604 30.3350733,15.1519604 C25.3464594,15.1519604 22.0785387,17.5157228 21.2842812,20.1636238 C21.124301,20.6504555 21.0320436,21.1184555 21.0320436,21.6178812 C21.0320436,22.9046733 22.0597664,23.6004357 23.0265981,23.6004357 C24.0241426,23.6004357 24.6339446,23.1568515 25.1503604,22.4360198 L25.6730139,21.7647327 C26.7120238,20.0472476 28.2143406,19.0732872 30.1380832,19.0732872 C32.794004,19.0732872 34.5046575,20.5800594 34.5046575,22.7900198 C34.5046575,24.7579604 33.2964001,25.7215248 30.7475882,27.4804753 C28.6674298,28.943406 27.1027367,30.485406 27.1027367,33.3210298 C27.1027367,33.42701 27.1027367,33.5819407 27.1027367,33.6816238 C27.1027367,35.2018218 27.9277664,35.9961387 29.4417268,35.9961387 Z M29.3739446,44.6472476 C31.0251921,44.6472476 32.4788555,43.2977823 32.4788555,41.6345941 C32.4788555,39.9280991 31.0559644,38.6219407 29.3739446,38.6219407 C27.6674496,38.6219407 26.2383208,39.9588714 26.2383208,41.6345941 C26.2383208,43.26701 27.6982218,44.6472476 29.3739446,44.6472476 Z" transform="translate(2 2)"/>
                    </svg>
                </a>
            </div>
            <div class="prototype-ribbon__cell"></div>
        </div>
    </div>

RIBBONEOF

    # Append the Prototype Info Modal (from <!-- Prototype Information Modal --> to <!-- Top Navbar -->)
    sed -n '/<!-- Prototype Information Modal -->/,/<!-- Top Navbar -->/{ /<!-- Top Navbar -->/d; p; }' "$SRC_HEADER" >> "${OUT_DIR}/.header-template.html"

    # Append navbar and subheader (from <!-- Top Navbar --> to </header>)
    sed -n '/<!-- Top Navbar -->/,/<\/header>/p' "$SRC_HEADER" >> "${OUT_DIR}/.header-template.html"

    # Fix icon paths for standalone structure
    sed -i.bak 's|../../assets/icons/regular/|icons/|g; s|../../files/|files/|g' "${OUT_DIR}/.header-template.html"
    rm "${OUT_DIR}/.header-template.html.bak"
}

# Function to get prototype title from nav data
get_prototype_title() {
    local PROTO_NAME=$1

    if [ -f "canvas-navigation-data.json" ]; then
        local TITLE
        TITLE=$(python3 -c "
import json, sys
with open('canvas-navigation-data.json') as f:
    data = json.load(f)
for item in data.get('mainNavigation', []):
    if item.get('url') == 'prototypes/${PROTO_NAME}':
        print(item.get('label', '')); sys.exit()
    for sub in item.get('subItems', []):
        if sub.get('url') == 'prototypes/${PROTO_NAME}':
            print(sub.get('label', '')); sys.exit()
" 2>/dev/null)
        if [ -n "$TITLE" ]; then
            echo "$TITLE"
            return
        fi
    fi

    # Fallback: convert folder name to title
    echo "$PROTO_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1'
}

# Function to build navigation JSON (neutralized nav links, subheader preserved)
build_standalone_nav_json() {
    local PROTO_NAME=$1

    if [ ! -f "canvas-navigation-data.json" ]; then
        echo '{"siteTitle":"Prototype","siteLogo":"","user":{"username":"User","avatarInitials":"U"},"mainNavigation":[],"userMenu":[],"subHeader":{"title":""},"currentPageHifiPrototypes":{}}'
        return
    fi

    python3 -c "
import json, sys

with open('canvas-navigation-data.json') as f:
    data = json.load(f)

proto_url = 'prototypes/${PROTO_NAME}'
sub_header = None
hifi = {}

# Find subHeader and hifiPrototypes for this prototype
for item in data.get('mainNavigation', []):
    if item.get('url') == proto_url:
        sub_header = item.get('subHeader')
        hifi = item.get('hifiPrototypes', {})
        break
    for sub in item.get('subItems', []):
        if sub.get('url') == proto_url:
            sub_header = sub.get('subHeader')
            hifi = sub.get('hifiPrototypes', {})
            break
    if sub_header is not None:
        break

# Neutralize navigation URLs (no inter-prototype links in offline mode)
for item in data.get('mainNavigation', []):
    item['url'] = '#'
    for sub in item.get('subItems', []):
        sub['url'] = '#'
for item in data.get('userMenu', []):
    item['url'] = '#'

# Set subheader
if isinstance(sub_header, str):
    data['subHeader'] = {'title': sub_header}
elif isinstance(sub_header, dict):
    data['subHeader'] = sub_header
else:
    data['subHeader'] = {'title': ''}

# Set hifi prototypes for footer
data['currentPageHifiPrototypes'] = hifi or {}

# Neutralize homeUrl, keep footer
data['homeUrl'] = '#'

print(json.dumps(data, ensure_ascii=False))
" 2>/dev/null
}

# Function to build offline index.html
build_offline_html() {
    local PROTO_NAME=$1
    local SRC_DIR=$2
    local OUT_DIR=$3
    local TITLE
    TITLE=$(get_prototype_title "$PROTO_NAME")

    local PAGE_CONTENT
    PAGE_CONTENT=$(extract_page_content "${SRC_DIR}/index.html")

    local NAV_JSON
    NAV_JSON=$(build_standalone_nav_json "$PROTO_NAME")

    # Create header template (simplified ribbon + modal + navbar + subheader)
    create_standalone_header "$OUT_DIR"
    local HEADER_TEMPLATE
    HEADER_TEMPLATE=$(cat "${OUT_DIR}/.header-template.html")
    rm "${OUT_DIR}/.header-template.html"

    # Get footer template (fix paths)
    local FOOTER_TEMPLATE
    FOOTER_TEMPLATE=$(sed 's|../../assets/icons/regular/|icons/|g; s|../../files/|files/|g' "assets/canvas/parts/footer.html")

    # Determine CSS link
    local CSS_LINK=""
    if [ -d "${SRC_DIR}/css" ]; then
        CSS_LINK='    <link rel="stylesheet" href="css/main.css">'
    elif [ -f "${SRC_DIR}/styles.css" ]; then
        CSS_LINK='    <link rel="stylesheet" href="styles.css">'
    fi

    # Determine JS scripts — preserve original load order from source index.html
    local JS_SCRIPTS=""
    if [ -d "${SRC_DIR}/js" ]; then
        # Extract script tags from source HTML (preserves dependency order)
        JS_SCRIPTS=$(grep -o '<script src="js/[^"]*"></script>' "${SRC_DIR}/index.html" | sed 's|<script src="|    <script src="|')
        # Fallback: if no script tags found in HTML, iterate files with main.js last
        if [ -z "$JS_SCRIPTS" ]; then
            for JSFILE in "${SRC_DIR}"/js/*.js; do
                [ ! -f "$JSFILE" ] && continue
                local BASENAME
                BASENAME=$(basename "$JSFILE")
                if [ "$BASENAME" != "main.js" ]; then
                    JS_SCRIPTS="${JS_SCRIPTS}    <script src=\"js/${BASENAME}\"></script>
"
                fi
            done
            JS_SCRIPTS="${JS_SCRIPTS}    <script src=\"js/main.js\"></script>"
        fi
    elif [ -f "${SRC_DIR}/script.js" ]; then
        JS_SCRIPTS='    <script src="script.js"></script>'
    fi

    # Write offline HTML
    cat > "${OUT_DIR}/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
HTMLEOF

    echo "    <title>${TITLE}</title>" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
    <link rel="stylesheet" href="lib/monalisa.min.css">
    <link rel="stylesheet" href="lib/plugins.css">
    <link rel="stylesheet" href="lib/canvas-styles.css">
HTMLEOF

    [ -n "$CSS_LINK" ] && echo "$CSS_LINK" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
</head>
<body>
    <div id="app"></div>

    <script id="page-content" type="text/html">
HTMLEOF

    echo "$PAGE_CONTENT" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
    </script>

    <script id="standalone-template-header" type="text/html">
HTMLEOF

    echo "$HEADER_TEMPLATE" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
    </script>

    <script id="standalone-template-footer" type="text/html">
HTMLEOF

    echo "$FOOTER_TEMPLATE" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
    </script>

    <script id="standalone-nav-data" type="application/json">
HTMLEOF

    echo "$NAV_JSON" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
    </script>

    <script src="lib/handlebars.min.js"></script>
    <script src="lib/standalone-init.js"></script>
    <script src="lib/plugins.js"></script>
HTMLEOF

    [ -n "$JS_SCRIPTS" ] && echo "$JS_SCRIPTS" >> "${OUT_DIR}/index.html"

    cat >> "${OUT_DIR}/index.html" << 'HTMLEOF'
    <script>document.dispatchEvent(new CustomEvent('davinci:canvas:ready', { detail: { timestamp: Date.now() } }));</script>
</body>
</html>
HTMLEOF
}

# Function to copy prototype source files (CSS, JS — not index.html)
copy_prototype_sources() {
    local SRC_DIR=$1
    local OUT_DIR=$2

    if [ -d "${SRC_DIR}/css" ]; then
        cp -r "${SRC_DIR}/css" "${OUT_DIR}/"
    elif [ -f "${SRC_DIR}/styles.css" ]; then
        cp "${SRC_DIR}/styles.css" "${OUT_DIR}/"
    fi

    if [ -d "${SRC_DIR}/js" ]; then
        cp -r "${SRC_DIR}/js" "${OUT_DIR}/"
    elif [ -f "${SRC_DIR}/script.js" ]; then
        cp "${SRC_DIR}/script.js" "${OUT_DIR}/"
    fi
}

# Function to copy library dependencies into lib/
copy_lib_files() {
    local OUT_DIR=$1

    mkdir -p "${OUT_DIR}/lib"

    # MDS CSS only (MDS JS conflicts with prototype event delegation in offline mode)
    if [ -f "assets/monalisa-design-system/dist/css/monalisa.min.css" ]; then
        cp "assets/monalisa-design-system/dist/css/monalisa.min.css" "${OUT_DIR}/lib/"
    fi

    # Canvas styles (navbar, subheader, content layout)
    cp "assets/canvas/canvas-styles.css" "${OUT_DIR}/lib/"

    # Standalone loader
    cp "assets/canvas/standalone-init.js" "${OUT_DIR}/lib/"

    # Handlebars
    cp "assets/canvas/handlebars.min.js" "${OUT_DIR}/lib/"

    # Plugins (all CSS and JS files)
    if [ -d "plugins" ]; then
        cp plugins/*.css "${OUT_DIR}/lib/" 2>/dev/null || true
        cp plugins/*.js "${OUT_DIR}/lib/" 2>/dev/null || true
    else
        echo "/* No plugins */" > "${OUT_DIR}/lib/plugins.css"
        echo "// No plugins" > "${OUT_DIR}/lib/plugins.js"
    fi
}

# Function to fix asset paths for flat structure
fix_offline_paths() {
    local OUT_DIR=$1

    # Prototype files: ../../assets/icons/regular/X.svg -> icons/X.svg
    # Prototype files: ../../files/X -> files/X
    local SED_RULES='s|../../assets/icons/regular/|icons/|g; s|../../files/|files/|g; s|../../assets/[^"'"'"'> )]*||g'

    # Fix index.html
    sed -i.bak "$SED_RULES" "${OUT_DIR}/index.html"
    rm "${OUT_DIR}/index.html.bak"

    # Fix CSS files
    if [ -d "${OUT_DIR}/css" ]; then
        find "${OUT_DIR}/css" -name "*.css" -exec sed -i.bak "$SED_RULES" {} \;
        find "${OUT_DIR}/css" -name "*.bak" -delete
    elif [ -f "${OUT_DIR}/styles.css" ]; then
        sed -i.bak "$SED_RULES" "${OUT_DIR}/styles.css"
        rm "${OUT_DIR}/styles.css.bak"
    fi

    # Fix JS files
    if [ -d "${OUT_DIR}/js" ]; then
        find "${OUT_DIR}/js" -name "*.js" -exec sed -i.bak "$SED_RULES" {} \;
        find "${OUT_DIR}/js" -name "*.bak" -delete
    elif [ -f "${OUT_DIR}/script.js" ]; then
        sed -i.bak "$SED_RULES" "${OUT_DIR}/script.js"
        rm "${OUT_DIR}/script.js.bak"
    fi

    # Fix lib CSS (plugins): ../assets/icons/regular/X.svg -> ../icons/X.svg
    find "${OUT_DIR}/lib" -name "*.css" -exec sed -i.bak 's|../assets/icons/regular/|../icons/|g' {} \;
    find "${OUT_DIR}/lib" -name "*.bak" -delete

    # Fix lib JS (plugins, non-minified): same pattern
    find "${OUT_DIR}/lib" -name "*.js" ! -name "*.min.js" -exec sed -i.bak 's|../assets/icons/regular/|../icons/|g' {} \;
    find "${OUT_DIR}/lib" -name "*.bak" -delete
}

# Function to copy only referenced icons
copy_referenced_icons() {
    local OUT_DIR=$1

    if [ ! -d "assets/icons/regular" ]; then
        return
    fi

    local ICON_LIST
    ICON_LIST=$(grep -rohE 'icons/[^"'"'"'> )\}]+\.svg' \
        "${OUT_DIR}/index.html" \
        "${OUT_DIR}/styles.css" \
        "${OUT_DIR}"/css/*.css \
        "${OUT_DIR}"/js/*.js \
        "${OUT_DIR}/script.js" \
        "${OUT_DIR}"/lib/*.css \
        "${OUT_DIR}"/lib/*.js \
        2>/dev/null | sort -u | sed 's|.*/||')

    # Also find standalone SVG filenames in JS (for ICON_PATH + 'name.svg' patterns)
    local JS_SVG_REFS
    JS_SVG_REFS=$(grep -rohE "[\"'"'"'][a-z0-9-]+\.svg[\"'"'"']" \
        "${OUT_DIR}"/js/*.js \
        "${OUT_DIR}/script.js" \
        2>/dev/null | tr -d "\"'" | sort -u)

    # Merge both lists
    if [ -n "$JS_SVG_REFS" ]; then
        ICON_LIST=$(printf "%s\n%s" "$ICON_LIST" "$JS_SVG_REFS" | sort -u)
    fi

    if [ -z "$ICON_LIST" ]; then
        return
    fi

    mkdir -p "${OUT_DIR}/icons"

    local ICON_COUNT=0
    while IFS= read -r ICON_FILE; do
        if [ -f "assets/icons/regular/${ICON_FILE}" ]; then
            cp "assets/icons/regular/${ICON_FILE}" "${OUT_DIR}/icons/"
            ICON_COUNT=$((ICON_COUNT + 1))
        fi
    done <<< "$ICON_LIST"

    if [ "$ICON_COUNT" -gt 0 ]; then
        printf "   ${GREEN}✅ ${ICON_COUNT} icons${NC}\n"
    fi
}

# Function to copy only referenced image files
copy_referenced_files() {
    local OUT_DIR=$1

    if [ ! -d "files" ]; then
        return
    fi

    local FILE_LIST
    FILE_LIST=$(grep -rohE 'files/[^"'"'"'> )\}]+' \
        "${OUT_DIR}/index.html" \
        "${OUT_DIR}/styles.css" \
        "${OUT_DIR}"/css/*.css \
        "${OUT_DIR}"/js/*.js \
        "${OUT_DIR}/script.js" \
        2>/dev/null | sort -u | sed 's|.*/||')

    if [ -z "$FILE_LIST" ]; then
        return
    fi

    mkdir -p "${OUT_DIR}/files"

    local FILE_COUNT=0
    while IFS= read -r FILENAME; do
        if [ -f "files/${FILENAME}" ]; then
            cp "files/${FILENAME}" "${OUT_DIR}/files/"
            FILE_COUNT=$((FILE_COUNT + 1))
        fi
    done <<< "$FILE_LIST"

    if [ "$FILE_COUNT" -gt 0 ]; then
        printf "   ${GREEN}✅ ${FILE_COUNT} image files${NC}\n"
    fi
}

# Function to export a single prototype
export_prototype() {
    local PROTO_NAME=$1
    local SRC_DIR="prototypes/${PROTO_NAME}"
    local OUT_DIR="offline/${PROTO_NAME}"

    if [ ! -f "${SRC_DIR}/index.html" ]; then
        printf "${RED}Error: No index.html in ${SRC_DIR}${NC}\n"
        return 1
    fi

    printf "${YELLOW}📋 Exporting ${PROTO_NAME}...${NC}\n"

    # Clean and create output directory
    rm -rf "${OUT_DIR}"
    mkdir -p "${OUT_DIR}"

    # Build offline HTML (ribbon + navbar + subheader + page content + footer)
    build_offline_html "$PROTO_NAME" "$SRC_DIR" "$OUT_DIR"

    # Copy prototype CSS and JS
    copy_prototype_sources "$SRC_DIR" "$OUT_DIR"

    # Copy library dependencies
    copy_lib_files "$OUT_DIR"

    # Fix asset paths for flat structure
    fix_offline_paths "$OUT_DIR"

    # Copy only referenced icons and files
    copy_referenced_icons "$OUT_DIR"
    copy_referenced_files "$OUT_DIR"
}

# Main script logic
if [ "$1" = "all" ]; then
    printf "${BLUE}🚀 Creating offline package for ALL prototypes...${NC}\n"
    echo ""

    # Clean previous offline output
    rm -rf "offline"

    EXPORTED=0
    for PROTOTYPE_DIR in prototypes/*/; do
        PROTOTYPE_NAME=$(basename "$PROTOTYPE_DIR")

        if [ ! -f "${PROTOTYPE_DIR}/index.html" ]; then
            continue
        fi

        export_prototype "$PROTOTYPE_NAME"
        EXPORTED=$((EXPORTED + 1))
        echo ""
    done

    TOTAL_SIZE=$(du -sh "offline" | cut -f1)

    printf "${GREEN}✅ Exported ${EXPORTED} prototypes${NC}\n"
    echo ""
    printf "${BLUE}📦 Package Details:${NC}\n"
    printf "   Location: offline/\n"
    printf "   Size:     ${TOTAL_SIZE}\n"
    echo ""
    printf "${GREEN}How to share:${NC}\n"
    echo "   Single: zip -r prototype-name.zip offline/prototype-name/"
    echo "   All:    cd offline && for d in */; do zip -r \"\${d%/}.zip\" \"\$d\"; done"
    echo ""
    echo "   Recipient: extract ZIP → double-click index.html"
    echo ""

else
    PROTOTYPE_NAME=$1
    PROTOTYPE_DIR="prototypes/${PROTOTYPE_NAME}"

    if [ ! -d "$PROTOTYPE_DIR" ]; then
        printf "${RED}Error: Prototype not found: ${PROTOTYPE_DIR}${NC}\n"
        exit 1
    fi

    printf "${BLUE}🚀 Creating offline package...${NC}\n"
    echo ""

    export_prototype "$PROTOTYPE_NAME"

    OUT_DIR="offline/${PROTOTYPE_NAME}"
    TOTAL_SIZE=$(du -sh "$OUT_DIR" | cut -f1)

    echo ""
    printf "${GREEN}✅ Offline package ready!${NC}\n"
    echo ""
    printf "${BLUE}📦 Details:${NC}\n"
    printf "   Location: ${OUT_DIR}/\n"
    printf "   Size:     ${TOTAL_SIZE}\n"
    echo ""
    printf "${GREEN}How to share:${NC}\n"
    echo "   zip -r ${PROTOTYPE_NAME}.zip offline/${PROTOTYPE_NAME}/"
    echo ""
    echo "   Recipient: extract ZIP → double-click index.html"
    echo ""
fi

printf "${YELLOW}Note: The original prototype files remain unchanged.${NC}\n"
echo "      You can continue editing prototypes/ normally."
echo ""
