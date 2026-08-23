/**
 * DataManager - Upravljanje podacima porodičnog stabla
 */

export class DataManager {
  constructor() {
    this.originalData = null;
    this.treeData = null;
    this.idCounter = 1;
    this.nodeMap = new Map();
    this.storageKey = 'markovic_family_tree_v5';
  }

  async loadData() {
    try {
      // Proveri prvo LocalStorage za sačuvane izmene
      const localData = localStorage.getItem(this.storageKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) {
            console.log('Učitani podaci iz LocalStorage');
            this.originalData = parsed;
            this.normalizeData();
            return this.treeData;
          }
        } catch (e) {
          console.warn('Greška pri čitanju LocalStorage, učitavamo sa servera:', e);
        }
      }

      // Učitavanje iz assets/json/drvo.json
      let response = await fetch('assets/json/drvo.json');
      if (!response.ok) {
        // Fallback na markovic.json ako drvo.json ne postoji ili error
        response = await fetch('assets/json/markovic.json');
      }
      
      const rawData = await response.json();
      this.originalData = rawData;
      this.normalizeData();
      return this.treeData;
    } catch (err) {
      console.error('Greška pri učitavanju JSON-a:', err);
      // Fallback pražnjenje ako je greška
      this.treeData = { id: 'root_1', name: 'Milan', gender: 'male', children: [] };
      return this.treeData;
    }
  }

  normalizeData() {
    this.nodeMap.clear();
    this.idCounter = 1;

    let rootInput = this.originalData;
    if (Array.isArray(rootInput)) {
      rootInput = rootInput[0] || { name: 'Milan', gender: 'male' };
    }

    const processNode = (node, parent = null, depth = 0) => {
      if (!node) return null;

      const id = node.id || `node_${this.idCounter++}`;
      
      // Normalizacija naziva slike
      let photoUrl = node.slika || node['slike/osoba.jpg'] || 'assets/img/osoba.jpg';
      if (photoUrl === 'slike/osoba.jpg') photoUrl = 'assets/img/osoba.jpg';

      const normalized = {
        id: id,
        name: node.name || 'Nepoznato ime',
        surname: node.surname || '',
        gender: (node.gender || 'male').toLowerCase(),
        od: (node.od && node.od !== 'godina') ? node.od : '',
        mr: (node.mr && node.mr !== 'MestoRođenja') ? node.mr : '',
        do: (node.do && node.do !== 'godina') ? node.do : '',
        ms: (node.ms && node.ms !== 'MestoSmrti') ? node.ms : '',
        brak: (node.brak && node.brak !== 'BračniPar') ? node.brak : '',
        titula: (node.titula && node.titula !== 'titula') ? node.titula : '',
        tel: (node.tel && node.tel !== 'fiksni') ? node.tel : '',
        mob: (node.mob && node.mob !== 'mobilni') ? node.mob : '',
        email: (node.email && node.email !== 'email') ? node.email : '',
        fb: (node.fb && node.fb !== 'facebook') ? node.fb : '',
        ig: (node.ig && node.ig !== 'instagram') ? node.ig : '',
        li: (node.li && node.li !== 'linkedin') ? node.li : '',
        sajt: (node.sajt && node.sajt !== 'websajt') ? node.sajt : '',
        slika: photoUrl,
        bio: (node.bio && node.bio !== 'biografija') ? node.bio : '',
        parentId: parent ? parent.id : null,
        depth: depth,
        collapsed: false,
        children: []
      };

      this.nodeMap.set(id, normalized);

      if (Array.isArray(node.children)) {
        normalized.children = node.children
          .map(child => processNode(child, normalized, depth + 1))
          .filter(Boolean);
      }

      return normalized;
    };

    this.treeData = processNode(rootInput);
  }

  getNodeById(id) {
    return this.nodeMap.get(id);
  }

  getAllNodes() {
    return Array.from(this.nodeMap.values());
  }

  // Filtriranje stabla (sakrivanje žena u patrilinearnom prikazu)
  getFilteredTree(hideFemales = false) {
    if (!hideFemales) return this.treeData;

    const getMaleDescendants = (node, effectiveParentId) => {
      if (!node || !node.children) return [];
      
      let results = [];
      node.children.forEach(child => {
        if (child.gender === 'female') {
          // Preskačemo ženu, ali tražimo njenu mušku decu i spajamo sa ocem (effectiveParentId)
          results = results.concat(getMaleDescendants(child, effectiveParentId));
        } else {
          // Muški član se zadržava
          const processed = cloneAndFilter(child, effectiveParentId);
          if (processed) results.push(processed);
        }
      });
      return results;
    };

    const cloneAndFilter = (node, effectiveParentId = null) => {
      if (!node) return null;

      const filteredChildren = getMaleDescendants(node, node.id);

      return {
        ...node,
        parentId: effectiveParentId || node.parentId,
        children: filteredChildren
      };
    };

    return cloneAndFilter(this.treeData, null);
  }

  // Dodavanje novog deteta u stablo
  addChild(parentId, newPersonData) {
    const parent = this.getNodeById(parentId);
    if (!parent) return false;

    const newId = `node_${Date.now()}`;
    const gender = newPersonData.gender || 'male';
    const defaultSurname = (gender === 'female') ? '' : (parent.surname || '');

    const newPerson = {
      id: newId,
      name: newPersonData.name || 'Novi član',
      surname: (newPersonData.surname !== undefined && newPersonData.surname !== null && newPersonData.surname !== '') ? newPersonData.surname : defaultSurname,
      gender: gender,
      od: newPersonData.od || '',
      mr: newPersonData.mr || '',
      do: newPersonData.do || '',
      ms: newPersonData.ms || '',
      brak: newPersonData.brak || '',
      titula: newPersonData.titula || '',
      tel: newPersonData.tel || '',
      mob: newPersonData.mob || '',
      email: newPersonData.email || '',
      fb: newPersonData.fb || '',
      ig: newPersonData.ig || '',
      li: newPersonData.li || '',
      sajt: newPersonData.sajt || '',
      slika: newPersonData.slika || 'assets/img/osoba.jpg',
      bio: newPersonData.bio || '',
      parentId: parentId,
      depth: parent.depth + 1,
      collapsed: false,
      children: []
    };

    parent.children.push(newPerson);
    this.nodeMap.set(newId, newPerson);

    this.saveToLocalStorage();
    return newPerson;
  }

  // Izmena postojeće osobe
  updatePerson(id, updatedData) {
    const person = this.getNodeById(id);
    if (!person) return false;

    Object.assign(person, updatedData);
    this.saveToLocalStorage();
    return person;
  }

  // Brisanje osobe
  deletePerson(id) {
    const person = this.getNodeById(id);
    if (!person || !person.parentId) return false; // Ne možemo obrisati root

    const parent = this.getNodeById(person.parentId);
    if (parent) {
      parent.children = parent.children.filter(child => child.id !== id);
    }
    this.nodeMap.delete(id);

    this.saveToLocalStorage();
    return true;
  }

  saveToLocalStorage() {
    try {
      const cleanData = this.exportCleanJSON();
      localStorage.setItem(this.storageKey, JSON.stringify(cleanData));
    } catch (e) {
      console.error('Greška pri čuvanju u LocalStorage:', e);
    }
  }

  resetToOriginal() {
    localStorage.removeItem(this.storageKey);
    return this.loadData();
  }

  // Čisti format za export drvo.json
  exportCleanJSON() {
    const cleanNode = (node) => {
      const result = {
        name: node.name,
        surname: node.surname || '',
        gender: node.gender
      };
      if (node.od) result.od = node.od;
      if (node.mr) result.mr = node.mr;
      if (node.do) result.do = node.do;
      if (node.ms) result.ms = node.ms;
      if (node.brak) result.brak = node.brak;
      if (node.titula) result.titula = node.titula;
      if (node.tel) result.tel = node.tel;
      if (node.mob) result.mob = node.mob;
      if (node.email) result.email = node.email;
      if (node.fb) result.fb = node.fb;
      if (node.ig) result.ig = node.ig;
      if (node.li) result.li = node.li;
      if (node.sajt) result.sajt = node.sajt;
      if (node.slika && node.slika !== 'assets/img/osoba.jpg') result.slika = node.slika;
      if (node.bio) result.bio = node.bio;

      if (node.children && node.children.length > 0) {
        result.children = node.children.map(cleanNode);
      }

      return result;
    };

    return [cleanNode(this.treeData)];
  }

  getStatistics() {
    const all = Array.from(this.nodeMap.values());
    const males = all.filter(n => n.gender === 'male').length;
    const females = all.filter(n => n.gender === 'female').length;
    const maxDepth = Math.max(...all.map(n => n.depth), 0) + 1;

    return {
      total: all.length,
      males,
      females,
      generations: maxDepth
    };
  }
}
