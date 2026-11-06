#!/usr/bin/env bash

set -e

JSON_MODE=false
DRY_RUN=false
ALLOW_EXISTING=false
SHORT_NAME=""
BRANCH_NUMBER=""
USE_TIMESTAMP=false
NUMBER_EXPLICIT=false
ARGS=()
i=1
while [ $i -le $# ]; do
    arg="${!i}"
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --allow-existing-branch)
            ALLOW_EXISTING=true
            ;;
        --short-name)
            if [ $((i + 1)) -gt $# ]; then
                echo 'Error: --short-name requires a value' >&2
                exit 1
            fi
            i=$((i + 1))
            next_arg="${!i}"
            if [[ "$next_arg" == --* ]]; then
                echo 'Error: --short-name requires a value' >&2
                exit 1
            fi
            SHORT_NAME="$next_arg"
            ;;
        --number)
            if [ $((i + 1)) -gt $# ]; then
                echo 'Error: --number requires a value' >&2
                exit 1
            fi
            i=$((i + 1))
            next_arg="${!i}"
            if [[ "$next_arg" == --* ]]; then
                echo 'Error: --number requires a value' >&2
                exit 1
            fi
            BRANCH_NUMBER="$next_arg"
            if [ -n "$BRANCH_NUMBER" ]; then
                NUMBER_EXPLICIT=true
            fi
            ;;
        --timestamp)
            USE_TIMESTAMP=true
            ;;
        --help|-h)
            echo "Usage: $0 [--json] [--dry-run] [--allow-existing-branch] [--short-name <name>] [--number N] [--timestamp] <feature_description>"
            echo ""
            echo "Options:"
            echo "  --json              Output in JSON format"
            echo "  --dry-run           Compute feature name and paths without creating directories or files"
            echo "  --allow-existing-branch  Reuse an existing feature directory if it already exists"
            echo "  --short-name <name> Provide a custom short name (2-4 words) for the feature"
            echo "  --number N          Prefer a feature number (auto-corrected if its specs prefix exists)"
            echo "  --timestamp         Use timestamp prefix (YYYYMMDD-HHMMSS) instead of sequential numbering"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 'Add user authentication system' --short-name 'user-auth'"
            echo "  $0 'Implement OAuth2 integration for API' --number 5"
            echo "  $0 --timestamp --short-name 'user-auth' 'Add user authentication'"
            exit 0
            ;;
        *)
            ARGS+=("$arg")
            ;;
    esac
    i=$((i + 1))
done

FEATURE_DESCRIPTION="${ARGS[*]}"
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Usage: $0 [--json] [--dry-run] [--allow-existing-branch] [--short-name <name>] [--number N] [--timestamp] <feature_description>" >&2
    exit 1
fi

FEATURE_DESCRIPTION=$(echo "$FEATURE_DESCRIPTION" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
if [ -z "$FEATURE_DESCRIPTION" ]; then
    echo "Error: Feature description cannot be empty or contain only whitespace" >&2
    exit 1
fi

MAX_FEATURE_NUMBER=9223372036854775807
MAX_BRANCH_LENGTH=244

is_feature_number_in_range() {
    local value="$1"
    local normalized="${value#"${value%%[!0]*}"}"
    [ -n "$normalized" ] || normalized=0
    [ ${#normalized} -lt ${#MAX_FEATURE_NUMBER} ] && return 0
    [ ${#normalized} -gt ${#MAX_FEATURE_NUMBER} ] && return 1
    # shellcheck disable=SC2071
    [[ "$normalized" < "$MAX_FEATURE_NUMBER" || "$normalized" == "$MAX_FEATURE_NUMBER" ]]
}

get_highest_from_specs() {
    local specs_dir="$1"
    local highest=0

    if [ -d "$specs_dir" ]; then
        for dir in "$specs_dir"/*; do
            [ -d "$dir" ] || continue
            dirname=$(basename "$dir")
            if echo "$dirname" | grep -Eq '^[0-9]{3,}-' && ! echo "$dirname" | grep -Eq '^[0-9]{8}-[0-9]{6}-'; then
                number=$(echo "$dirname" | grep -Eo '^[0-9]+')
                if is_feature_number_in_range "$number"; then
                    number=$((10#$number))
                    if [ "$number" -gt "$highest" ]; then
                        highest=$number
                    fi
                fi
            fi
        done
    fi

    echo "$highest"
}

spec_prefix_exists() {
    local specs_dir="$1"
    local feature_num="$2"

    for spec_path in "$specs_dir/${feature_num}-"*; do
        [ -d "$spec_path" ] && return 0
    done
    return 1
}

contains_non_ascii() {
    LC_ALL=C grep -q '[^[:print:][:cntrl:]]'
}

UNICODE_LOCALE=""
locale_candidates=(C.UTF-8 C.utf8 en_US.UTF-8 en_US.utf8 "${LC_CTYPE:-${LANG:-}}")
if [ -n "${LC_ALL:-}" ]; then
    locale_candidates=("$LC_ALL")
fi
for candidate in "${locale_candidates[@]}"; do
    if [ -n "$candidate" ] && [ "$(printf 'é。' | LC_ALL="$candidate" sed 's/[^[:alnum:]]/-/g' 2>/dev/null)" = 'é-' ]; then
        UNICODE_LOCALE="$candidate"
        break
    fi
done

if [ -z "$UNICODE_LOCALE" ]; then
    UNICODE_LOCALE=C
    if printf '%s' "${SHORT_NAME:-$FEATURE_DESCRIPTION}" | contains_non_ascii; then
        if [ -n "${LC_ALL:-}" ]; then
            echo "Error: A UTF-8 locale is required to create a Unicode feature name; LC_ALL=$LC_ALL is not usable" >&2
        else
            echo "Error: A UTF-8 locale is required to create a Unicode feature name" >&2
        fi
        exit 1
    fi
fi

unicode_words() {
    local name="${1//$'\n'/ }"
    local separator="$2"
    if printf '%s' "$name" | contains_non_ascii; then
        local -a python_cmd=()
        local override="${SPECKIT_PYTHON_EXECUTABLE:-${SPECKIT_PYTHON:-}}"
        if [ -n "$override" ] && command -v "$override" >/dev/null 2>&1 &&
            "$override" -c 'import sys; raise SystemExit(sys.version_info.major != 3)' >/dev/null 2>&1; then
            python_cmd=("$override")
        else
            local python_line
            while IFS= read -r python_line; do
                python_cmd+=("$python_line")
            done < <(_python3_command)
        fi
        if [ "${#python_cmd[@]}" -eq 0 ]; then
            echo "Error: Python 3 is required to create a Unicode feature name" >&2
            return 1
        fi
        printf '%s' "$name" | "${python_cmd[@]}" -c '
import sys
value = sys.stdin.buffer.read().decode("utf-8")
lower = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
result = "".join(
    char if char.isalpha() or char.isdecimal() else sys.argv[1]
    for char in value.translate(lower)
)
sys.stdout.buffer.write(result.encode("utf-8"))
' "$separator"
    else
        printf '%s' "$name" | LC_ALL=C tr '[:upper:]' '[:lower:]' | LC_ALL=C sed "s/[^a-z0-9]/$separator/g"
    fi
}

clean_branch_name() {
    local name="$1"
    local cleaned
    cleaned=$(unicode_words "$name" '-') || return 1
    printf '%s\n' "$cleaned" | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

branch_byte_count() {
    printf '%s' "$1" | wc -c | tr -d '[:space:]'
}

fit_branch_name() {
    local feature_num="$1"
    local branch_suffix="$2"
    local branch_name="${feature_num}-${branch_suffix}"

    if [ "$(branch_byte_count "$branch_name")" -gt "$MAX_BRANCH_LENGTH" ]; then
        local prefix_length=$(( ${#feature_num} + 1 ))
        local max_suffix_length=$((MAX_BRANCH_LENGTH - prefix_length))
        local truncated_suffix
        local -x LC_ALL="$UNICODE_LOCALE"
        local low=0 high=${#branch_suffix} mid
        if (( high > max_suffix_length )); then
            high=$max_suffix_length
        fi
        while (( low < high )); do
            mid=$(((low + high + 1) / 2))
            if [ "$(branch_byte_count "${branch_suffix:0:$mid}")" -le "$max_suffix_length" ]; then
                low=$mid
            else
                high=$((mid - 1))
            fi
        done
        truncated_suffix="${branch_suffix:0:$low}"
        truncated_suffix="${truncated_suffix%-}"
        branch_name="${feature_num}-${truncated_suffix}"
    fi

    printf '%s' "$branch_name"
}

shell_quote() {
    local value="$1" LC_ALL=C
    if [[ "$value" =~ ^[A-Za-z0-9_@%+=:,./-]+$ ]]; then
        printf '%s' "$value"
    else
        local q="'\"'\"'"
        printf "'%s'" "${value//\'/$q}"
    fi
}

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT=$(get_repo_root) || exit 1

cd "$REPO_ROOT"

SPECS_DIR="$REPO_ROOT/specs"
if [ "$DRY_RUN" != true ]; then
    mkdir -p "$SPECS_DIR"
fi

generate_branch_name() {
    local description="$1"

    local stop_words="^(i|a|an|the|to|for|of|in|on|at|by|with|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|may|might|must|shall|this|that|these|those|my|your|our|their|want|need|add|get|set)$"

    local -x LC_ALL="$UNICODE_LOCALE"
    local clean_name
    clean_name=$(unicode_words "$description" ' ') || return 1

    local meaningful_words=()
    for word in $clean_name; do
        [ -z "$word" ] && continue

        if ! printf '%s\n' "$word" | LC_ALL=C grep -qE "$stop_words"; then
            if [ ${#word} -ge 3 ] || printf '%s' "$word" | contains_non_ascii; then
                meaningful_words+=("$word")
            elif printf '%s' "$description" | LC_ALL=C grep -qw -- "$(printf '%s' "$word" | LC_ALL=C tr '[:lower:]' '[:upper:]')"; then
                meaningful_words+=("$word")
            fi
        fi
    done

    if [ ${#meaningful_words[@]} -gt 0 ]; then
        local max_words=3
        if [ ${#meaningful_words[@]} -eq 4 ]; then max_words=4; fi

        local result=""
        local count=0
        for word in "${meaningful_words[@]}"; do
            if [ $count -ge $max_words ]; then break; fi
            if [ -n "$result" ]; then result="$result-"; fi
            result="$result$word"
            count=$((count + 1))
        done
        echo "$result"
    else
        local cleaned=$(clean_branch_name "$description")
        echo "$cleaned" | tr '-' '\n' | grep -v '^$' | head -3 | tr '\n' '-' | sed 's/-$//'
    fi
}

if [ -n "$SHORT_NAME" ]; then
    BRANCH_SUFFIX=$(clean_branch_name "$SHORT_NAME")
else
    BRANCH_SUFFIX=$(generate_branch_name "$FEATURE_DESCRIPTION")
fi

if [ -z "$BRANCH_SUFFIX" ]; then
    echo "[specify] Warning: Feature name is empty after removing unsupported characters. Use --short-name with letters or digits (for example, user-auth)." >&2
fi

if [ "$USE_TIMESTAMP" = true ] && [ -n "$BRANCH_NUMBER" ]; then
    >&2 echo "[specify] Warning: --number is ignored when --timestamp is used"
    BRANCH_NUMBER=""
fi

if [ "$USE_TIMESTAMP" = true ]; then
    FEATURE_NUM=$(date +%Y%m%d-%H%M%S)
    BRANCH_NAME="${FEATURE_NUM}-${BRANCH_SUFFIX}"
else
    if [ -n "$BRANCH_NUMBER" ] && [[ ! "$BRANCH_NUMBER" =~ ^[0-9]+$ ]]; then
        echo "Error: --number must be an unsigned integer, got '$BRANCH_NUMBER'" >&2
        exit 1
    fi

    if [ -n "$BRANCH_NUMBER" ] && ! is_feature_number_in_range "$BRANCH_NUMBER"; then
        echo "Error: --number must be between 0 and $MAX_FEATURE_NUMBER, got '$BRANCH_NUMBER'" >&2
        exit 1
    fi

    if [ -z "$BRANCH_NUMBER" ]; then
        HIGHEST=$(get_highest_from_specs "$SPECS_DIR")
        if [ "$HIGHEST" -eq "$MAX_FEATURE_NUMBER" ]; then
            echo "Error: feature number must be between 0 and $MAX_FEATURE_NUMBER, got '9223372036854775808'" >&2
            exit 1
        fi
        BRANCH_NUMBER=$((HIGHEST + 1))
    fi

    FEATURE_NUM=$(printf "%03d" "$((10#$BRANCH_NUMBER))")

    if [ "$NUMBER_EXPLICIT" = true ]; then
        SPEC_CONFLICT=false
        REQUESTED_BRANCH_NAME=$(fit_branch_name "$FEATURE_NUM" "$BRANCH_SUFFIX")
        REQUESTED_DIR="$SPECS_DIR/$REQUESTED_BRANCH_NAME"
        if [ "$ALLOW_EXISTING" != true ] || [ ! -d "$REQUESTED_DIR" ]; then
            spec_prefix_exists "$SPECS_DIR" "$FEATURE_NUM" && SPEC_CONFLICT=true
        fi

        if [ "$SPEC_CONFLICT" = true ]; then
            REQUESTED_NUM="$FEATURE_NUM"
            HIGHEST=$(get_highest_from_specs "$SPECS_DIR")
            BRANCH_NUMBER=$HIGHEST
            while true; do
                if [ "$BRANCH_NUMBER" -eq "$MAX_FEATURE_NUMBER" ]; then
                    echo "Error: feature number must be between 0 and $MAX_FEATURE_NUMBER, got '9223372036854775808'" >&2
                    exit 1
                fi
                BRANCH_NUMBER=$((BRANCH_NUMBER + 1))
                FEATURE_NUM=$(printf "%03d" "$((10#$BRANCH_NUMBER))")
                spec_prefix_exists "$SPECS_DIR" "$FEATURE_NUM" || break
            done
            >&2 echo "[specify] Warning: --number $REQUESTED_NUM conflicts with an existing spec directory; using $FEATURE_NUM instead"
        fi
    fi

fi

ORIGINAL_BRANCH_NAME="${FEATURE_NUM}-${BRANCH_SUFFIX}"
BRANCH_NAME=$(fit_branch_name "$FEATURE_NUM" "$BRANCH_SUFFIX")
if [ "$BRANCH_NAME" != "$ORIGINAL_BRANCH_NAME" ]; then
    >&2 echo "[specify] Warning: Branch name exceeded GitHub's 244-byte limit"
    >&2 echo "[specify] Original: $ORIGINAL_BRANCH_NAME ($(branch_byte_count "$ORIGINAL_BRANCH_NAME") bytes)"
    >&2 echo "[specify] Truncated to: $BRANCH_NAME ($(branch_byte_count "$BRANCH_NAME") bytes)"
fi

FEATURE_DIR="$SPECS_DIR/$BRANCH_NAME"
SPEC_FILE="$FEATURE_DIR/spec.md"

if [ "$DRY_RUN" != true ]; then
    if [ -d "$FEATURE_DIR" ] && [ "$ALLOW_EXISTING" != true ]; then
        if [ "$USE_TIMESTAMP" = true ]; then
            >&2 echo "Error: Feature directory '$FEATURE_DIR' already exists. Rerun to get a new timestamp or use a different --short-name."
        else
            >&2 echo "Error: Feature directory '$FEATURE_DIR' already exists. Please use a different feature name or specify a different number with --number."
        fi
        exit 1
    fi

    NEEDS_SPEC=false
    SPEC_TEMPLATE_FOUND=false
    SPEC_TEMPLATE_CONTENT=""
    if [ ! -f "$SPEC_FILE" ]; then
        NEEDS_SPEC=true
        if SPEC_TEMPLATE_CONTENT=$(resolve_template_content "spec-template" "$REPO_ROOT"; status=$?; printf x; exit "$status"); then
            SPEC_TEMPLATE_CONTENT="${SPEC_TEMPLATE_CONTENT%x}"
            SPEC_TEMPLATE_FOUND=true
        else
            resolve_status=$?
            if [ "$resolve_status" -ne 1 ]; then
                exit "$resolve_status"
            fi
        fi
    fi

    mkdir -p "$FEATURE_DIR"

    if [ "$NEEDS_SPEC" = true ]; then
        if [ "$SPEC_TEMPLATE_FOUND" = true ]; then
            printf '%s' "$SPEC_TEMPLATE_CONTENT" > "$SPEC_FILE"
        else
            echo "Warning: Spec template not found; created empty spec file" >&2
            touch "$SPEC_FILE"
        fi
    fi

    if [[ "${SPECIFY_FEATURE_NO_PERSIST:-}" != "1" && "${SPECIFY_FEATURE_NO_PERSIST:-}" != "true" ]]; then
        _persist_feature_json "$REPO_ROOT" "$FEATURE_DIR"
    fi

    printf '# To persist: export SPECIFY_FEATURE=%s\n' "$(shell_quote "$BRANCH_NAME")" >&2
    printf '#              export SPECIFY_FEATURE_DIRECTORY=%s\n' "$(shell_quote "$FEATURE_DIR")" >&2
fi

if $JSON_MODE; then
    if command -v jq >/dev/null 2>&1; then
        if [ "$DRY_RUN" = true ]; then
            jq -cn \
                --arg branch_name "$BRANCH_NAME" \
                --arg spec_file "$SPEC_FILE" \
                --arg feature_num "$FEATURE_NUM" \
                '{BRANCH_NAME:$branch_name,SPEC_FILE:$spec_file,FEATURE_NUM:$feature_num,DRY_RUN:true}'
        else
            jq -cn \
                --arg branch_name "$BRANCH_NAME" \
                --arg spec_file "$SPEC_FILE" \
                --arg feature_num "$FEATURE_NUM" \
                '{BRANCH_NAME:$branch_name,SPEC_FILE:$spec_file,FEATURE_NUM:$feature_num}'
        fi
    else
        if [ "$DRY_RUN" = true ]; then
            printf '{"BRANCH_NAME":"%s","SPEC_FILE":"%s","FEATURE_NUM":"%s","DRY_RUN":true}\n' "$(json_escape "$BRANCH_NAME")" "$(json_escape "$SPEC_FILE")" "$(json_escape "$FEATURE_NUM")"
        else
            printf '{"BRANCH_NAME":"%s","SPEC_FILE":"%s","FEATURE_NUM":"%s"}\n' "$(json_escape "$BRANCH_NAME")" "$(json_escape "$SPEC_FILE")" "$(json_escape "$FEATURE_NUM")"
        fi
    fi
else
    echo "BRANCH_NAME: $BRANCH_NAME"
    echo "SPEC_FILE: $SPEC_FILE"
    echo "FEATURE_NUM: $FEATURE_NUM"
    if [ "$DRY_RUN" != true ]; then
        printf '# To persist in your shell: export SPECIFY_FEATURE=%s\n' "$(shell_quote "$BRANCH_NAME")"
        printf '#                           export SPECIFY_FEATURE_DIRECTORY=%s\n' "$(shell_quote "$FEATURE_DIR")"
    fi
fi
