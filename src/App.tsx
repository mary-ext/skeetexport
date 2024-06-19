import { createResource, createSignal } from "solid-js";

import { writeTarEntry as write_tar_entry } from "@mary/tar";

import { CarBlockIterator } from "@ipld/car";
import { decode as decode_cbor } from "@ipld/dag-cbor";
import { coerce } from "multiformats/bytes";
import { CID } from "multiformats/cid";
import { from } from "multiformats/hashes/hasher";

import { showSaveFilePicker as show_save_picker } from "native-file-system-adapter";

function App() {
  const [file, setFile] = createSignal<Blob>();

  const [resource] = createResource(file, async ($file) => {
    const handle = await show_save_picker({
      suggestedName: "repo.tar",

      // @ts-expect-error: no idea why these aren't typed
      id: "repo-archive",
      startIn: "downloads",
      types: [
        {
          description: "Tarball archive",
          accept: { "application/x-tar": [".tar"] },
        },
      ],
    });

    const writable = await handle.createWritable({ keepExistingData: false });

    const iterator = read_car_repository($file);
    for await (const { collection, rkey, value } of iterator) {
      const tar_entry = write_tar_entry({
        filename: `repo/${collection}/${rkey}.json`,
        data: JSON.stringify(value, null, "\t"),
      });

      await writable.write(tar_entry);
    }

    await writable.close();
  });

  return (
    <div>
      <input
        type="file"
        onchange={(ev) => {
          const files = ev.target.files!;
          if (files.length !== 0) {
            const file = files[0];
            setFile(file);
          }
        }}
      />

      <p>
        {(() => {
          if (resource.loading) {
            return `in progress`;
          }

          if (resource.error) {
            console.error(resource.error);
            return `errored, check console`;
          }

          return `idle`;
        })()}
      </p>
    </div>
  );
}

export default App;

type BlockMap = Map<string, Uint8Array>;

interface Commit {
  version: 3;
  did: string;
  data: CID;
  rev: string;
  prev: CID | null;
  sig: Uint8Array;
}

interface TreeEntry {
  /** count of bytes shared with previous TreeEntry in this Node (if any) */
  p: number;
  /** remainder of key for this TreeEntry, after "prefixlen" have been removed */
  k: Uint8Array;
  /** link to a sub-tree Node at a lower level which has keys sorting after this TreeEntry's key (to the "right"), but before the next TreeEntry's key in this Node (if any) */
  v: CID;
  /** next subtree (to the right of leaf) */
  t: CID | null;
}

interface MstNode {
  /** link to sub-tree Node on a lower level and with all keys sorting before keys at this node */
  l: CID | null;
  /** ordered list of TreeEntry objects */
  e: TreeEntry[];
}

interface NodeEntry {
  key: string;
  cid: CID;
}

const mf_sha256 = from({
  name: "sha2-256",
  code: 0x12,
  encode: async (input) => {
    const digest = await crypto.subtle.digest("sha-256", input);
    return coerce(digest);
  },
});

const decoder = new TextDecoder();

async function* read_car_repository(file: Blob) {
  const car_buffer = new Uint8Array(await file.arrayBuffer());
  const car = await CarBlockIterator.fromBytes(car_buffer);

  const roots = await car.getRoots();
  assert(roots.length === 1, `expected 1 root commit`);

  const root_cid = roots[0];
  const blockmap: BlockMap = new Map();

  for await (const { cid, bytes } of car) {
    await verify_cid_for_bytes(cid, bytes);
    blockmap.set(cid.toString(), bytes);
  }

  const commit = read_obj(blockmap, root_cid) as Commit;

  for (const { key, cid } of walk_entries(blockmap, commit.data)) {
    const [collection, rkey] = key.split("/");
    const value = read_obj(blockmap, cid);

    yield { collection, rkey, value };
  }
}

async function verify_cid_for_bytes(cid: CID, bytes: Uint8Array) {
  const digest = await mf_sha256.digest(bytes);
  const expected = CID.createV1(cid.code, digest);

  if (!cid.equals(expected)) {
    throw new Error(`Invalid CID, expected ${expected} but got ${cid}`);
  }
}

function* walk_entries(map: BlockMap, pointer: CID): Generator<NodeEntry> {
  const data = read_obj(map, pointer) as MstNode;
  const entries = data.e;

  let last_key = "";

  if (data.l !== null) {
    yield* walk_entries(map, data.l);
  }

  for (let i = 0, il = entries.length; i < il; i++) {
    const entry = entries[i];

    const key_str = decoder.decode(entry.k);
    const key = last_key.slice(0, entry.p) + key_str;

    last_key = key;

    yield { key: key, cid: entry.v };

    if (entry.t !== null) {
      yield* walk_entries(map, entry.t);
    }
  }
}

function read_obj(map: Map<string, Uint8Array>, cid: CID) {
  const bytes = map.get(cid.toString());
  assert(bytes != null, `cid not found`);

  const data = decode_cbor(bytes);

  return data;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
