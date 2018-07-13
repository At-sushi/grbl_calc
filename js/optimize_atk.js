// vim: sts=2 sw=2 ts=2 expandtab

/*
 * なにか上手いやり方をして
 * 全体の攻撃力を適当に最高なところまで
 * 引きあげる計算をするファイル
 */

import {
  calculate_atkval,
  is_valid_weapon_obj,
  is_valid_summon_obj
} from "./atk_calc";

// 現在の計算状態を表わす定数
export const CALC_STATE = {
  UNINIT: "UNINIT",
  PARAM_INITED: "PARAM_INITED",
  GA_INITED: "GA_INITED",
  CALC_VALUE: "CALC_VALUE",
  SORT_POPULATION: "SORT_POPULATION",
  SELECT_POPULATION: "SELECT_POPULATION",
  INTERSECT_GENE: "INTERSECT_GENE",
  MUTATION: "MUTATION",
  LOOP_START: "LOOP_START",
  LOOP_END: "LOOP_END"
};


// [min, max]の乱整数を返す
// from: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function get_random_int(min, max) {
  return Math.floor( Math.random() * (max - min + 1) ) + min;
}


// 遺伝的アルゴリズムを用いて最適編成を求めようとするクラス
/*
 * gene(遺伝子): 遺伝情報を表わす要素。今回は正の整数([1,max_length])を使う。
 * chromosome(染色体): 遺伝子が並んだ一次元配列。
 * population(集団): 染色体によって表わされた個体(individual)の集団。
 *
 * 1つの遺伝子は
 * 「前の遺伝子が示している(武器|召喚|フレンド召喚)の位置からの距離」を
 * 示す。その分だけ配列の末端へシフトしたのが示されるもの。
 * 末端を超えた分は先頭へループする。
 * 一番最初だけは配列の先頭を指しているものと考える。
 */
export class GrblFormGAOptimizer {
  // コンストラクタ
  // 初期の計算状態を設定する
  constructor() {
    this.state = { status: CALC_STATE.UNINIT };
  }

  // 計算前の初期化関数
  // 計算に必要な各オブジェクトを受けとる
  // 戻り値としてジェネレータを返す
  // TODO: (まだ)再度initされることは想定していない
  init(base_param, weapon_list, summon_list, friend_list, job_data) {
    // 必要な変数に代入する
    this.base = Object.assign({}, base_param);
    this.weapon_list = Array.from(weapon_list, x => {return is_valid_weapon_obj(x) ? x : null;} );
    this.summon_list = Array.from(summon_list, x => {return is_valid_summon_obj(x) ? x : null;} );
    this.friend_list = Array.from(friend_list, x => {return is_valid_summon_obj(x) ? x : null;} );  // フレンド召喚も召喚
    this.job_data = job_data;  // job_dataは変更されないことが前提

    // 配列を辞書に変換する関数
    let arytoobj = (list) => {
      let obj = {};
      for (let i = 0; i < list.length; i++) {
        let target = list[i];
        if (target instanceof Object) {
          if (!("max" in target && target.max >= 0)) {
            target.max = 1
          }
          if (!("min" in target && target.min >= 0)) {
            target.min = 0
          }
          obj[String(i)] = target;
        }
      }
      return obj;
    }

    // 武器配列を辞書に変換する
    this.weapon_obj = arytoobj(this.weapon_list);
    // 召喚配列を辞書に変換する
    this.summon_obj = arytoobj(this.summon_list);
    // フレンド召喚配列を辞書に変換する
    this.friend_obj = arytoobj(this.friend_list);

    // 状態変数を初期状態に
    this.state.status = CALC_STATE.PARAM_INITED;

    // ジェネレータを作って返す
    return this.calculate_();
  }

  // 初期状態を作成する関数
  // 集団の大きさ、各パラメータごとの変異率を設定する
  create_first_ga_state(population_length, weapon_mutation, summon_mutation, friend_mutation) {

    // 集団の大きさをチェックする
    population_length = population_length > 0 ? population_length : 50;

    // 突然変異確率を指定する
    weapon_mutation = ((weapon_mutation > 0) && (weapon_mutation < 1)) ? weapon_mutation : 0.01;
    summon_mutation = ((summon_mutation > 0) && (summon_mutation < 1)) ? summon_mutation : 0.01;
    friend_mutation = ((friend_mutation > 0) && (friend_mutation < 1)) ? friend_mutation : 0.01;

    // 集団を作成する汎用関数
    let create_ga_state = (max_num, c_length, m_prob) => {
      // パラメータを設定
      let mutation_probability = Number(m_prob);
      let chromo_length = Number(c_length);
      let max_gene_number = Number(max_num);
      let length = population_length;
      let population = [];

      // 初期集団を生成する
      for (let i = 0; i < length; i++) {
        // 順序列の生成
        let tmp_ary = [...Array(max_gene_number).keys()];  // [0,1,2,...]
        // 生成された順序列を乱雑なものにする
        for (let j = max_gene_number - 1; j > 0; j--) {
          let ri = get_random_int(0, j);
          [tmp_ary[ri], tmp_ary[j]] = [tmp_ary[j], tmp_ary[ri]];
        }

        // 個体の生成
        // 遺伝子は順序表現(残りの中で何番目にあるか)
        // ※0ベース
        let individual = [];
        let gene_numbers = [...Array(max_gene_number).keys()];
        for (let i of tmp_ary) {
          let index = gene_numbers.indexOf(i);
          individual.push(index);
          gene_numbers.splice(index, 1);
        }

        // 集団に積みこむ
        population.push(individual);
      }

      // 生成された集団と各パラメータを返す
      return [ population, { mutation_probability, chromo_length, max_gene_number }];
    };

    // 実際に武器等の状態を作成する
    // [a, b] = [1, 2] -> a = 1; b = 2;
    let [weapon_ga_ary, weapon_ga_param] = create_ga_state(this.ref.weapon.length, this.weapon_max_chromo_length, weapon_mutation);
    let [summon_ga_ary, summon_ga_param] = create_ga_state(this.ref.summon.length, this.summon_max_chromo_length, summon_mutation);
    let [friend_ga_ary, friend_ga_param] = create_ga_state(this.ref.friend.length, this.friend_max_chromo_length, friend_mutation);

    // 最終的な初期状態を生成する
    let ga_param = { population: [], param: { weapon: weapon_ga_param, summon: summon_ga_param, friend: friend_ga_param, base: this.base } };
    for (let i = 0; i < population_length; i++) {
      let individual = { weapon: weapon_ga_ary[i], summon: summon_ga_ary[i], friend: friend_ga_ary[i], value: null };
      ga_param.population.push(individual);
    }
    ga_param.max_population_length = population_length;

    // 現在の状態を設定する
    this.state.status = CALC_STATE.GA_INITED;
    this.state.ga_state = ga_param;
    return true;
  }

  /*
   * 個体はobjtorefで作成されたリストを参照する染色体で出来ている。
   * objtorefによって作成されたリストはarytoobjで作成されたObjectを参照している。
   */

  // 順序表現で記された染色体を元の表記を表わす配列に変換する関数
  // 0ベース
  conv_orderchromos_to_origchromos(chromos, length) {
    let gene_array = [...Array(length).keys()];
    let result = [];
    for (let i of chromos) {
      result.push(gene_array[i]);
      gene_array.splice(i, 1);
    }
    return result;
  }

  // 元の表記(配列のindex)で表わされた遺伝子をキーの配列に変換する関数
  conv_origchromos_to_objkeyarray(chromos, ref_array) {
    return chromos.map((i) => { return ref_array[i] });
  }

  // オブジェクトのキー配列を遺伝子から生成する関数
  conv_chromos_to_array(chromos, ref_array) {
    let result = this.conv_origchromos_to_objkeyarray(
      this.conv_orderchromos_to_origchromos(chromos, ref_array.length),
      ref_array
    );
    return result;
  }

  // キーの配列からObjectの配列に変換する関数
  objkeyarray_to_objarray(ary, ref_obj) {
    let result = [];
    ary.forEach(function (key) {
      result.push(ref_obj[String(key)]);
    });
    return result;
  }

  // individualとして渡された個体の価値を求める
  evaluate_value(individual) {
    // キーの配列に対して同じキーを指しているものが「ない」かをチェックする
    function is_valid_key_array(ary) {
      let s = new Set(ary);
      return (s.size == ary.length);
    }

    // 個体の染色体をキーを表わす配列に変換する
    let [weapon_ary, summon_ary, friend_ary] =
    [
      this.conv_chromos_to_array(individual.weapon, this.ref.weapon),
      this.conv_chromos_to_array(individual.summon, this.ref.summon),
      this.conv_chromos_to_array(individual.friend, this.ref.friend)
    ];

    // もし同じものを2度選択しているなら、その個体の価値は0
    let valid_ary = [weapon_ary, summon_ary, friend_ary];
    let valid_result = new Array();
    valid_ary.forEach((v) => { valid_result.push(is_valid_key_array(v)) });
    if (valid_result.includes(false)) return 0;

    // キー値を示す配列からパラメータを生成する
    let param_weapon = this.objkeyarray_to_objarray(weapon_ary, this.weapon_obj);
    let param_summon = this.objkeyarray_to_objarray(summon_ary, this.summon_obj);
    let param_friend = this.objkeyarray_to_objarray(friend_ary, this.friend_obj);

    // 最終的な算出に使うパラメータを生成する
    // TODO: ハードコーディングしてるのをどうにかする
    // sliceは添字の*直前*まで取りだす
    let final_param = Object.assign({}, this.base, {
      weapon: param_weapon.slice(0, 10),
      summon: param_summon.slice(0, 5),
      friend: param_friend[0]
    });

    // 最終的な攻撃力を算出して返す
    let result;
    result = calculate_atkval(final_param, this.job_data);
    result = result.total_atk;
    return [result, final_param];
  }

  // 各個体に価値(攻撃力)を設定する
  // 価値の見積りは途中で中断可能にする
  *assign_value() {
    // 現在のステートを実行前に設定する
    this.state.status = CALC_STATE.CALC_VALUE;
    // 分数形式の文字列として渡すために最大長を文字列として保管する
    let l = String(this.state.ga_state.population.length);

    // 集団を個体に分解して価値を付ける
    for (let i = 0; i < this.state.ga_state.population.length; i++ ) {
      // 個体を取りだす
      let individual = this.state.ga_state.population[i];
      // 価値を付ける
      let result = this.evaluate_value(individual);
      this.state.ga_state.population[i].value = result[0];
      // 外に出すメッセージ用の文字列を設定する
      this.state.message = "ASSIGN VALUE: " + String(i+1) + "/" + String(l);
      // いったん中断する
      yield this.state;
    }
  }

  // 集団を価値によってソートする
  // ソートは中断困難なのでジェネレータにしない
  sort_population() {
    this.state.status = CALC_STATE.SORT_POPULATION;
    this.state.message = "SORTING";
    this.state.ga_state.population.sort((l, r) => {
      if (l === null && r === null) {
        return 0;
      } else if (r === null) {
        return -1;
      } else if (l === null) {
        return 1;
      } else {
        return r.value - l.value;
      }
    });
    this.state.message = "SORTED";
  }

  // 集団の選別をする関数
  *select_population() {
    this.state.status = CALC_STATE.SELECT_POPULATION;
    this.state.message = "START SELECTION";
    // 価値が無い個体を削除する
    this.state.ga_state.population = this.state.ga_state.population.filter((v) => {
      return (v.value != null && v.value > 0);
    });
    yield this.state;
    // 個体が1つだと選別できない
    if (this.state.ga_state.population.length > 1){
      // 全体の価値最大値を保存する
      let max_value = this.state.ga_state.population[0].value;
      let population_length = this.state.ga_state.population.length;
      let min_value = this.state.ga_state.population[population_length - 1].value;
      // 全体の半分以上になるまで選別する
      // TODO: ハードコーディングしているのをどうにかする
      let target_length = Math.round(this.state.ga_state.population.length / 2);
      let new_population = this.state.ga_state.population.slice(0, Math.round(target_length / 2));
      let total_value = 0;
      this.state.ga_state.population.forEach((v) => { total_value = total_value + v.value; });
      while (target_length > new_population.length) {
        this.state.ga_state.population.forEach((v) => {
          if (Math.random() < (v.value / total_value)) {
            new_population.push(v);
          }
        });
      }
      this.state.ga_state.population = new_population;
      this.state.message = "SELECTION:" + String(this.state.ga_state.population.length);
      yield this.state;
    }
    this.state.message = "FINISH SELECTION";
    yield this.state;
  }

  // 交叉を行なうジェネレータ関数
  *intersect() {
    this.state.status = CALC_STATE.INTERSECT_GENE;
    this.state.message = "START INTERSECTION";
    // 2つの遺伝子を受けとり交叉して新しい2つの遺伝子を返す関数
    // l_gene.length === r_gene.length
    let intersect_gene = (l_gene, r_gene) => {
      let i_point = [get_random_int(0, l_gene.length), get_random_int(0, l_gene.length)];
      // 交叉する
      if (i_point[0] === i_point[1]) {
        if (i_point[0] == 0 || i_point[0] == l_gene.length) {
          return [r_gene, l_gene];
        } else {
          if (i_point[0] < i_point[1]) {
            [i_point[1], i_point[0]] = [i_point[0], i_point[1]];
          }
          let i_length = i_point[1] - i_point[0];
          let l_cut = l_gene.splice(i_point[0], i_length);
          let r_cut = r_gene.splice(i_point[0], i_length);
          l_gene.splice(i_point[0], 0, ...r_cut);
          r_gene.splice(i_point[0], 0, ...l_cut);
        }
      }
      return [l_gene, r_gene];
    };
    // 必要な分だけ交叉して個体を集団に追加する
    while (this.state.ga_state.population.length < this.state.ga_state.max_population_length) {
      // 交叉の対象となる2つの個体を選択する
      // TODO: 1つしか個体が無かった場合の処理をどうにかする
      let target_num = [0, 0];
      while (target_num[0] === target_num[1]) {
        target_num[0] = get_random_int(0, this.state.ga_state.population.length - 1);
        target_num[1] = get_random_int(0, this.state.ga_state.population.length - 1);
      }
      // 交叉対象となる個体をコピーする
      // そのまま代入すると元も変更されてしまう
      let template_gene = {weapon: [], summon: [], friend: []};
      let l_gene = Object.assign({}, template_gene);
      let r_gene = Object.assign({}, template_gene);
      l_gene.weapon = Array.from(this.state.ga_state.population[target_num[0]].weapon);
      l_gene.summon = Array.from(this.state.ga_state.population[target_num[0]].summon);
      l_gene.friend = Array.from(this.state.ga_state.population[target_num[0]].friend);
      r_gene.weapon = Array.from(this.state.ga_state.population[target_num[1]].weapon);
      r_gene.summon = Array.from(this.state.ga_state.population[target_num[1]].summon);
      r_gene.friend = Array.from(this.state.ga_state.population[target_num[1]].friend);
      // 交叉して結果をもらう
      // intersect_geneは[遺伝子, 遺伝子]を返す
      // TODO: データ構造が直前と違うのでどうにかしたい
      let i_result = [Object.assign(template_gene), Object.assign(template_gene)];
      [i_result[0].weapon, i_result[1].weapon] = intersect_gene(l_gene.weapon, r_gene.weapon);
      [i_result[0].summon, i_result[1].summon] = intersect_gene(l_gene.summon, r_gene.summon);
      [i_result[0].friend, i_result[1].friend] = intersect_gene(l_gene.friend, r_gene.friend);
      this.state.ga_state.population = this.state.ga_state.population.concat(i_result);
      this.state.message = "INTERSECTION: " + Number(this.state.ga_state.population.length);
      yield this.state;
    }
    this.state.message = "FINISH INTERSECTION";
    yield this.state;
  }

  // 突然変異を行なうジェネレータ関数
  *mutation() {
    // 変異前に状態変更
    this.state.status = CALC_STATE.MUTATION;
    this.state.message = "START MUTATION";
    yield this.state;
    // 変異の開始
    const gene_type = ["weapon", "summon", "friend"];
    for (let individual of this.state.ga_state.population) {
      let target = Object.assign({}, individual);
      for (let t of gene_type) {
        // 変異する確率判定に成功したなら2つの遺伝子を入れかえる
        if (Math.random() < this.state.ga_state.param[t].mutation_probability) {
          let target_num = [0, 0];
          // そもそも対象の遺伝子の長さが1なら入れかえようがない
          if (individual[t].length != 1) {
            // ランダムに2つの遺伝子を選択する
            while (target_num[0] === target_num[1]) {
              target_num[0] = get_random_int(0, individual[t].length - 1);
              target_num[1] = get_random_int(0, individual[t].length - 1);
            }
            // いったんキー(位置)に戻してから入れかえる
            let tmp_orig = this.conv_orderchromos_to_origchromos(individual[t], this.ref[t].length);
            [tmp_orig[target_num[1]], tmp_orig[target_num[0]]] = [tmp_orig[target_num[0]], tmp_orig[target_num[1]]];
            // キーを順序表記に変換する
            let tmp_indi = [];
            let max_gene_number = this.state.ga_state.param[t].max_gene_number;
            let gene_numbers = [...Array(max_gene_number).keys()];
            for (let i of tmp_orig) {
              let index = gene_numbers.indexOf(i);
              tmp_indi.push(index);
              gene_numbers.splice(index, 1);
            }
            target[t] = tmp_indi;
          }
        }
      }
      // もし変異した結果のほうがよかったのなら入れかえる
      if (this.evaluate_value(individual) < this.evaluate_value(target)) {
        individual = target;
      }
    }
    // 変異後の状態変更
    this.state.message = "FINISHED MUTATION";
    yield this.state;
  }

  // 計算を進めるジェネレータ関数
  // 計算の状態はObjectで返ってくる(はず)
  *calculate_() {
    // パラメータを初期化(=初期集団を生成)するまで待つ
    while (this.state.status == CALC_STATE.PARAM_INITED) {
      yield this.state;
    }
    // 初期集団に価値を設定してソートする
    yield* this.assign_value();
    this.sort_population();
    yield this.state;

    // 永久に回す
    // 止めるかどうかは呼びだし元次第
    while (true) {
      // ループスタート
      this.state.status == CALC_STATE.LOOP_START;
      this.state.message == "Loop begin.";
      yield this.state;

      // 選別
      yield* this.select_population();

      // 交叉
      yield* this.intersect();

      // 突然変異
      yield* this.mutation();

      // 価値を設定してソート
      yield* this.assign_value();
      this.sort_population();
      yield this.state;

      // ループエンド
      // トップの価値をメッセージにする.
      this.state.status = CALC_STATE.LOOP_END;
      this.state.message = "CURRENT TOP: " + String(this.state.ga_state.population[0].value);
      yield this.state;
    }
  }

}
